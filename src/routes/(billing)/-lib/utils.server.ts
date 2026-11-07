import Stripe from "stripe"

import TrialStartedEmail from "@/emails/trial-started-email"
import { ACTIVE_SUBSCRIPTION_STATUSES, PENDING_SUBSCRIPTION_STATUSES } from "@/lib/config"
import {
  readAccountByEmail,
  readAccountByEmailCaseInsensitive,
  readAccountById,
  readActiveSubscriptionByAccountId,
} from "@/lib/db.server"
import { runInTransaction } from "@/lib/schema.server"
import { normalizeEmail } from "@/lib/utils"
import {
  getSiteConfig,
  getSiteUrl,
  readEmailBrand,
  requireIntegrationSetting,
  sendSesEmail,
} from "@/lib/utils.server"
import type { PricingPlan, SubscriptionInterval } from "@/types/subscription"

import {
  createOrUpdateAccountSubscription,
  readSubscriptionByStripeCustomerId,
  restoreLapsedCourseEnrollments,
  softDeleteLapsedCourseEnrollments,
} from "./db.server"
import { formatSubscriptionPrice, toIntervalPlanName, toSubscriptionPlanName } from "./utils"

let stripeClient: { secretKey: string; client: Stripe } | undefined

/**
 * The Stripe client, created on first use rather than at import so a route that never touches
 * billing doesn't pay for it, and again whenever `/manage/config` gets a new key. No `apiVersion`
 * is pinned: the SDK's own default matches its types, and overriding it is how the two drift apart.
 */
export async function getStripeClient(): Promise<Stripe> {
  const { billing } = (await getSiteConfig()).integrations
  const secretKey = requireIntegrationSetting(billing.stripeSecretKey, "The Stripe secret key")
  if (stripeClient?.secretKey !== secretKey) {
    stripeClient = { secretKey, client: new Stripe(secretKey) }
  }
  return stripeClient.client
}

/**
 * Stripe prices, held for the life of the process: a price is immutable, so repricing means a
 * new id and a cache miss. Only successes land here, so a failure retries rather than pins null.
 */
const stripePriceCache = new Map<string, Stripe.Price>()

async function readStripePrice(priceId: string): Promise<Stripe.Price> {
  const cached = stripePriceCache.get(priceId)
  if (cached) return cached

  const price = await (await getStripeClient()).prices.retrieve(priceId)
  stripePriceCache.set(priceId, price)

  return price
}

/** The one Stripe product's two prices — checkout and the pricing page both key off this. */
export async function readPriceIdForInterval(interval: SubscriptionInterval): Promise<string> {
  const { billing } = (await getSiteConfig()).integrations
  return interval === "year"
    ? requireIntegrationSetting(billing.annualPriceId, "The annual price ID")
    : requireIntegrationSetting(billing.monthlyPriceId, "The monthly price ID")
}

/**
 * Which plan a recorded subscription is on. Null for a price we no longer offer, which is why
 * every caller has to cope with a subscriber whose interval is unknown.
 */
export async function readIntervalForPriceId(
  priceId: string | null,
): Promise<SubscriptionInterval | null> {
  if (!priceId) return null
  const { billing } = (await getSiteConfig()).integrations
  if (priceId === billing.monthlyPriceId) return "month"
  if (priceId === billing.annualPriceId) return "year"
  return null
}

/**
 * Both paid cards on the pricing page, with amounts read from Stripe but cached per price id —
 * one call per process, not per render. A failure degrades to a null amount and hides that
 * card's price rather than failing the whole page.
 */
export async function readSubscriptionPlans(): Promise<Record<SubscriptionInterval, PricingPlan>> {
  const { pricing } = await getSiteConfig()

  async function readPlan(interval: SubscriptionInterval): Promise<PricingPlan> {
    const plan = {
      name: toIntervalPlanName(pricing, interval),
      tagline: interval === "year" ? pricing.yearlyTagline : pricing.monthlyTagline,
      benefits: pricing.benefits,
    }

    try {
      const price = await readStripePrice(await readPriceIdForInterval(interval))
      return {
        ...plan,
        // Stripe quotes in minor units — 900 cents rather than 9 dollars.
        amount: price.unit_amount == null ? null : price.unit_amount / 100,
        currency: price.currency,
        interval,
      }
    } catch (error) {
      console.error(`Failed to read the ${interval}ly subscription price from Stripe.`, error)
      return { ...plan, amount: null, currency: null, interval }
    }
  }

  const [month, year] = await Promise.all([readPlan("month"), readPlan("year")])
  return { month, year }
}

/** Whether a Stripe status is one of the two that grant access. */
export function isActiveSubscriptionStatus(status: string): boolean {
  return ACTIVE_SUBSCRIPTION_STATUSES.includes(status)
}

/** Whether a Stripe status means "hasn't started yet" rather than "has lapsed". */
export function isPendingSubscriptionStatus(status: string): boolean {
  return PENDING_SUBSCRIPTION_STATUSES.includes(status)
}

/**
 * Verifies a webhook payload against the signing secret. `constructEventAsync` rather than
 * the sync version because the runtime's crypto is async — the sync one throws here.
 */
export async function constructStripeEvent(
  payload: string,
  signature: string,
): Promise<Stripe.Event> {
  const { billing } = (await getSiteConfig()).integrations
  const secret = requireIntegrationSetting(billing.stripeWebhookSecret, "The Stripe webhook secret")
  return (await getStripeClient()).webhooks.constructEventAsync(payload, signature, secret)
}

/**
 * Flexible-billing subscriptions (the portal's default now) schedule a cancel through `cancel_at`
 * and leave `cancel_at_period_end` false, so reading only the latter shows them as renewing.
 */
export function isCancelScheduled(subscription: Stripe.Subscription): boolean {
  return subscription.cancel_at_period_end || subscription.cancel_at !== null
}

/**
 * The one place subscription state is written, called from both the webhook and the browser
 * back from Checkout — either may arrive first, and both halves are idempotent, so the race is
 * harmless. The write and the enrollment change share a transaction.
 */
export async function syncStripeSubscription(
  subscription: Stripe.Subscription,
): Promise<number | null> {
  const resolvedAccountId = await resolveSubscriptionAccountId(subscription)
  if (!resolvedAccountId) {
    console.error(`Stripe subscription ${subscription.id} has no account to attach to — skipping.`)
    return null
  }

  // As of Stripe API 2025-03-31 the period moved off the subscription onto its items.
  const periodEnd = subscription.items.data[0]?.current_period_end

  const { accountId, created } = await runInTransaction(async (tx) => {
    // The upsert keeps the owner it was first recorded with, so it can disagree with what we
    // just resolved — and everything below has to follow the row rather than the resolution,
    // or we'd revoke one account's enrollments over another account's subscription.
    const recorded = await createOrUpdateAccountSubscription(
      {
        accountId: resolvedAccountId,
        stripeCustomerId: toStripeId(subscription.customer),
        stripeSubscriptionId: subscription.id,
        stripePriceId: subscription.items.data[0]?.price.id ?? null,
        status: subscription.status,
        currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
        cancelAtPeriodEnd: isCancelScheduled(subscription),
      },
      tx,
    )
    const { accountId } = recorded

    if (accountId !== resolvedAccountId) {
      console.error(
        `Stripe subscription ${subscription.id} resolved to account ${resolvedAccountId} but is ` +
          `recorded against ${accountId}; keeping the recorded owner.`,
      )
    }

    // Deliberately re-asked of the account rather than read off `subscription.status`: an
    // account can hold two subscriptions at once, because cancelling leaves the old one
    // `active` until its period ends and they can subscribe again in the meantime. When the
    // old one finally reports `deleted`, its status says "no access" while the account is
    // very much still paying — trusting it would revoke a live subscriber's enrollments.
    const hasAccess = !!(await readActiveSubscriptionByAccountId(accountId, tx))

    if (hasAccess) {
      const restored = await restoreLapsedCourseEnrollments(accountId, tx)
      if (restored) console.info(`Restored ${restored} enrollment(s) for account ${accountId}.`)
      return recorded
    }

    // No access, but an `incomplete` subscription is one that never granted any — the card
    // is still awaiting SCA, or was declined. Revoking here would punish a failed *attempt*
    // to subscribe. A real lapse arrives later under its own status.
    if (isPendingSubscriptionStatus(subscription.status)) return recorded

    const revoked = await softDeleteLapsedCourseEnrollments(accountId, tx)
    if (revoked) console.info(`Revoked ${revoked} enrollment(s) for account ${accountId}.`)
    return recorded
  })

  // After the commit, so a rolled-back sync can't have announced a trial that isn't recorded.
  if (created && subscription.status === "trialing") {
    await sendTrialStartedEmail(accountId, subscription)
  }
  return accountId
}

/** Best-effort: the trial is live either way, so a failure is logged rather than retried. */
async function sendTrialStartedEmail(
  accountId: number,
  subscription: Stripe.Subscription,
): Promise<void> {
  try {
    const account = await readAccountById(accountId)
    if (!account) return

    const trialEnd = subscription.trial_end
    const recurring = subscription.items.data[0]?.price.recurring?.interval
    const interval: SubscriptionInterval | null =
      recurring === "month" ? "month" : recurring === "year" ? "year" : null
    const firstCharge = formatSubscriptionPrice(await readFirstCharge(subscription))

    const siteUrl = getSiteUrl()
    const config = await getSiteConfig()
    const { general, pricing } = config
    const planName = toSubscriptionPlanName(config)
    const trialEndDate = trialEnd
      ? new Date(trialEnd * 1000).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          timeZone: "UTC",
        })
      : null

    await sendSesEmail({
      to: account.email,
      cc: [general.supportEmail],
      subject: `Your ${planName} trial has started`,
      reactBody: TrialStartedEmail({
        brand: await readEmailBrand(),
        recipientName: account.name || account.username,
        planName,
        trialDays: pricing.trialDays,
        trialEndDate,
        interval,
        firstCharge,
        benefits: pricing.benefits,
        coursesUrl: `${siteUrl}/#courses`,
        settingsUrl: `${siteUrl}/settings`,
      }),
    })
  } catch (error) {
    console.error(`Failed to send the trial email to account ${accountId}.`, error)
  }
}

/**
 * What the first invoice after the trial will come to. Previewed from Stripe rather than read off
 * the price, since checkout takes promotion codes and the invoice may carry tax; falls back to the
 * list price if the preview fails, so the email still goes out.
 */
async function readFirstCharge(
  subscription: Stripe.Subscription,
): Promise<{ amount: number | null; currency: string | null }> {
  try {
    const stripe = await getStripeClient()
    const invoice = await stripe.invoices.createPreview({ subscription: subscription.id })
    // Stripe quotes in minor units — 900 cents rather than 9 dollars.
    return { amount: invoice.amount_due / 100, currency: invoice.currency }
  } catch (error) {
    console.error(`Failed to preview the first invoice of ${subscription.id}.`, error)
    const item = subscription.items.data[0]
    const unitAmount = item?.price.unit_amount
    return {
      amount: unitAmount == null ? null : (unitAmount * (item.quantity ?? 1)) / 100,
      currency: item?.price.currency ?? null,
    }
  }
}

/**
 * The account a Stripe subscription belongs to. Metadata is the fast path and covers anything
 * that went through our Checkout; the two fallbacks are for one created by hand in the Stripe
 * dashboard, which carries none — the customer matched against subscriptions we already hold,
 * then the customer's email address.
 */
async function resolveSubscriptionAccountId(
  subscription: Stripe.Subscription,
): Promise<number | null> {
  const fromMetadata = Number(subscription.metadata?.accountId)
  if (Number.isInteger(fromMetadata) && fromMetadata > 0) return fromMetadata

  const customerId = toStripeId(subscription.customer)

  const existing = await readSubscriptionByStripeCustomerId(customerId)
  if (existing) return existing.accountId

  return readAccountIdByStripeCustomerEmail(customerId)
}

/**
 * The account matching a Stripe customer's email address. Only reached for a subscription with
 * no metadata and no customer of ours, so it can't attach a Checkout subscription to the wrong
 * account — but note a Stripe customer's email is editable in the dashboard.
 */
async function readAccountIdByStripeCustomerEmail(customerId: string): Promise<number | null> {
  let customer: Stripe.Customer | Stripe.DeletedCustomer
  try {
    customer = await (await getStripeClient()).customers.retrieve(customerId)
  } catch (error) {
    console.error(`Failed to retrieve Stripe customer ${customerId}.`, error)
    return null
  }

  if (customer.deleted || !customer.email) return null

  // Same two-step as everywhere else an address arrives from outside: the legacy accounts
  // table has mixed-case emails that a normalized exact match misses.
  const email = normalizeEmail(customer.email)
  const account =
    (await readAccountByEmail(email)) ?? (await readAccountByEmailCaseInsensitive(email))

  return account?.id ?? null
}

/**
 * Stripe returns these either expanded or as a bare id. Throws rather than yielding an empty
 * string, which would reach a NOT NULL column and fail much later with an opaque portal error.
 */
export function toStripeId(value: string | { id: string } | null): string {
  const id = typeof value === "string" ? value : value?.id
  if (!id) throw new Error("Expected a Stripe id, got null.")
  return id
}
