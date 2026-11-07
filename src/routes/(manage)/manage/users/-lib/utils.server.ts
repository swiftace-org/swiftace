import type { IntegrationSettings } from "@/types/site-config"
import type { ManagedUserSubscription, SubscriptionPlan } from "@/types/user"

/** The price ids are server-only config, so the plan is resolved before it reaches the table. */
export function toSubscriptionPlan(
  stripePriceIds: (string | null)[],
  { monthlyPriceId, annualPriceId }: IntegrationSettings["billing"],
): SubscriptionPlan {
  if (!stripePriceIds.length) return "free"
  if (annualPriceId && stripePriceIds.includes(annualPriceId)) return "yearly"
  if (monthlyPriceId && stripePriceIds.includes(monthlyPriceId)) return "monthly"
  return "pro"
}

/**
 * Cancelling leaves the old subscription live until its period ends, and they can resubscribe
 * meanwhile, so it's only "canceling" when every live one is — and the link goes to one that renews.
 */
export function toSubscriptionSummary(
  subscriptions: { stripeSubscriptionId: string; status: string; cancelAtPeriodEnd: boolean }[],
  paymentFailed: boolean,
): ManagedUserSubscription | null {
  if (!subscriptions.length) return null
  const renewing = subscriptions.find((subscription) => !subscription.cancelAtPeriodEnd)
  return {
    stripeSubscriptionId: (renewing ?? subscriptions[0]).stripeSubscriptionId,
    trialing: subscriptions.some((subscription) => subscription.status === "trialing"),
    canceling: !renewing,
    paymentFailed,
  }
}
