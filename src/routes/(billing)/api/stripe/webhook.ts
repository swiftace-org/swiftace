import { createFileRoute } from "@tanstack/react-router"
import type Stripe from "stripe"

import { captureEvent, getSiteConfig } from "@/lib/utils.server"

import {
  constructStripeEvent,
  getStripeClient,
  isCancelScheduled,
  syncStripeSubscription,
} from "../../-lib/utils.server"

/**
 * Stripe's authoritative feed of subscription state, registered by hand in the dashboard against
 * this path. A handler-only route: no component and no session, so Stripe authenticates with a
 * signature over the raw body. This is what makes a lapse take effect, with nobody on a page.
 */
export const Route = createFileRoute("/(billing)/api/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // A 503 rather than a 404, so Stripe keeps retrying and catches up once billing is back on.
        if (!(await getSiteConfig()).integrations.billing.enabled) {
          return new Response("Billing is turned off", { status: 503 })
        }

        const signature = request.headers.get("stripe-signature")
        if (!signature) return new Response("Missing signature", { status: 400 })

        // The raw text, not the parsed body: the signature covers the exact bytes sent, so
        // anything that round-trips through JSON would fail to verify.
        const payload = await request.text()

        let event: Stripe.Event
        try {
          event = await constructStripeEvent(payload, signature)
        } catch (error) {
          console.error("Rejected a Stripe webhook with an invalid signature.", error)
          return new Response("Invalid signature", { status: 400 })
        }

        try {
          await handleStripeEvent(event)
        } catch (error) {
          // A 500 asks Stripe to retry, which is what we want for a transient DB failure —
          // the handler is idempotent, so a replay is safe.
          console.error(`Failed to handle Stripe event ${event.type} (${event.id}).`, error)
          return new Response("Handler failed", { status: 500 })
        }

        return new Response(null, { status: 204 })
      },
    },
  },
})

/**
 * Every event we act on ends in the same place: resolve the Stripe subscription, then let
 * `syncStripeSubscription` decide what it means. Unrecognized events are acknowledged
 * rather than rejected, so enabling extra ones in the dashboard can't wedge the endpoint.
 */
async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object
      if (session.mode !== "subscription" || !session.subscription) return

      // Sessions arrive with the subscription unexpanded, so it has to be fetched.
      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : session.subscription.id
      const stripe = await getStripeClient()
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      await syncStripeSubscription(subscription)
      return
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      // `deleted` still carries the full object, with `status: "canceled"` — which is
      // precisely what revokes the enrollments.
      const accountId = await syncStripeSubscription(event.data.object)
      if (accountId) captureSubscriptionEvent(accountId, event)
      return
    }

    default:
      return
  }
}

/** Keyed off the event type and `previous_attributes`, which only `updated` events carry. */
function captureSubscriptionEvent(
  accountId: number,
  event:
    | Stripe.CustomerSubscriptionCreatedEvent
    | Stripe.CustomerSubscriptionUpdatedEvent
    | Stripe.CustomerSubscriptionDeletedEvent,
) {
  const subscription = event.data.object
  const properties = {
    status: subscription.status,
    interval: subscription.items.data[0]?.price.recurring?.interval,
    courseSlug: subscription.metadata.courseSlug,
  }

  if (event.type === "customer.subscription.created") {
    captureEvent(accountId, "subscription_started", properties)
    return
  }
  if (event.type === "customer.subscription.deleted") {
    captureEvent(accountId, "subscription_ended", properties)
    return
  }

  const previous = event.data.previous_attributes ?? {}
  if (previous.status === "trialing" && subscription.status === "active") {
    captureEvent(accountId, "trial_converted", properties)
  }
  if (previous.cancel_at_period_end !== undefined || previous.cancel_at !== undefined) {
    captureEvent(
      accountId,
      isCancelScheduled(subscription)
        ? "subscription_cancel_scheduled"
        : "subscription_cancel_reverted",
      properties,
    )
  }
}
