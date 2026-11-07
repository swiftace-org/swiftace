import { createServerFn } from "@tanstack/react-start"
import type Stripe from "stripe"

import { readActiveSubscriptionByAccountId } from "@/lib/db.server"
import { authMiddleware, integrationMiddleware } from "@/lib/utils"
import { getSiteUrl } from "@/lib/utils.server"
import type { SubscriptionInterval } from "@/types/subscription"

import { readLatestSubscriptionByAccountId } from "../-lib/db.server"
import { getStripeClient, readPriceIdForInterval } from "../-lib/utils.server"

/**
 * Opens Stripe's hosted billing portal, where cancelling, resuming, card updates and plan
 * changes happen; every change comes back as a `customer.subscription.*` webhook. Passing an
 * `interval` deep-links to the confirm screen for that price, which is how switching works.
 */
export const submitBillingPortalSession = createServerFn({ method: "POST" })
  .middleware([integrationMiddleware("billing"), authMiddleware])
  .validator((data: { interval?: SubscriptionInterval }) => data)
  .handler(async ({ data, context }): Promise<{ url: string } | { error: string }> => {
    // The plain portal is keyed off the latest subscription rather than the active one, so a
    // lapsed subscriber can still get in to fix their card. A switch needs a live one.
    const subscription = data.interval
      ? await readActiveSubscriptionByAccountId(context.account.id)
      : await readLatestSubscriptionByAccountId(context.account.id)

    if (!subscription) {
      return { error: "You don't have a subscription to manage yet." }
    }

    if (
      data.interval &&
      subscription.stripePriceId === (await readPriceIdForInterval(data.interval))
    ) {
      return { error: "You're already on that plan." }
    }

    try {
      const flowData = data.interval
        ? await buildPlanChangeFlow(subscription.stripeSubscriptionId, data.interval)
        : undefined

      const stripe = await getStripeClient()
      const session = await stripe.billingPortal.sessions.create({
        customer: subscription.stripeCustomerId,
        return_url: `${getSiteUrl()}/settings`,
        ...(flowData ? { flow_data: flowData } : {}),
      })

      return { url: session.url }
    } catch (error) {
      console.error(`Failed to open a billing portal for account ${context.account.id}.`, error)
      // Overwhelmingly this means the portal — or its plan-switching feature — has never been
      // turned on in the Stripe dashboard, a one-time setup step rather than anything they did.
      return { error: "Could not open the billing portal. Please try again." }
    }
  })

/**
 * The deep link to Stripe's "confirm your plan change" screen. It needs the id of the item
 * being repriced, which we don't store, so the subscription is re-read from Stripe.
 */
async function buildPlanChangeFlow(
  stripeSubscriptionId: string,
  interval: SubscriptionInterval,
): Promise<Stripe.BillingPortal.SessionCreateParams.FlowData> {
  const subscription = await (await getStripeClient()).subscriptions.retrieve(stripeSubscriptionId)

  const item = subscription.items.data[0]
  if (!item) throw new Error(`Stripe subscription ${stripeSubscriptionId} has no items.`)

  return {
    type: "subscription_update_confirm",
    subscription_update_confirm: {
      subscription: stripeSubscriptionId,
      items: [{ id: item.id, price: await readPriceIdForInterval(interval), quantity: 1 }],
    },
  }
}
