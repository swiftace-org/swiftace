import { createServerFn } from "@tanstack/react-start"

import { authMiddleware, integrationMiddleware } from "@/lib/utils"
import {
  captureEvent,
  getSiteConfig,
  getSiteUrl,
  readHasActiveSubscription,
} from "@/lib/utils.server"
import type { SubscriptionInterval } from "@/types/subscription"

import { readLatestSubscriptionByAccountId } from "../../-lib/db.server"
import { getStripeClient, readPriceIdForInterval } from "../../-lib/utils.server"

/**
 * Opens a Stripe Checkout session and hands back its URL. Nothing is written here — the
 * subscription only exists once Stripe says so, which is what `/pricing/complete` and the
 * webhook are for. `courseSlug` rides along in the metadata so the return trip can enroll.
 */
export const submitCheckoutSession = createServerFn({ method: "POST" })
  .middleware([integrationMiddleware("billing"), authMiddleware])
  .validator((data: { courseSlug?: string; interval: SubscriptionInterval }) => data)
  .handler(async ({ data, context }): Promise<{ url: string } | { error: string }> => {
    const { account } = context

    if (data.interval !== "month" && data.interval !== "year") {
      return { error: "Choose a monthly or yearly plan." }
    }

    if (await readHasActiveSubscription(account.id)) {
      return { error: "You already have an active subscription." }
    }

    // Reusing the customer from any earlier subscription keeps a resubscribe from minting a
    // second Stripe customer for the same person, which would split their billing history.
    const previous = await readLatestSubscriptionByAccountId(account.id)
    const { pricing } = await getSiteConfig()
    const isTrial = pricing.trialEnabled && !previous
    const metadata = {
      accountId: String(account.id),
      ...(data.courseSlug ? { courseSlug: data.courseSlug } : {}),
    }

    const siteUrl = getSiteUrl()
    const cancelPath = data.courseSlug ? `/course/${data.courseSlug}` : "/pricing"

    try {
      const stripe = await getStripeClient()
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price: await readPriceIdForInterval(data.interval), quantity: 1 }],
        ...(previous ? { customer: previous.stripeCustomerId } : { customer_email: account.email }),
        metadata,
        // Repeated on the subscription so `customer.subscription.*` events, which don't
        // carry the session's metadata, can still be traced back to an account.
        subscription_data: {
          metadata,
          ...(isTrial
            ? {
                trial_period_days: pricing.trialDays,
                trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
              }
            : {}),
        },
        payment_method_collection: "always",
        allowed_payment_method_types: ["card"],
        // `{CHECKOUT_SESSION_ID}` is a Stripe placeholder — it must not be encoded.
        success_url: `${siteUrl}/pricing/complete?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}${cancelPath}`,
        allow_promotion_codes: true,
      })

      if (!session.url) {
        console.error(`Stripe returned checkout session ${session.id} with no URL.`)
        return { error: "Could not start the checkout. Please try again." }
      }

      captureEvent(account.id, "checkout_started", {
        interval: data.interval,
        courseSlug: data.courseSlug,
        isTrial,
      })
      return { url: session.url }
    } catch (error) {
      console.error("Failed to create a Stripe checkout session.", error)
      return { error: "Could not start the checkout. Please try again." }
    }
  })
