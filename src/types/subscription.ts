/** A row of `account_subscriptions`, mirroring one Stripe subscription. */
export type AccountSubscription = {
  id: number
  accountId: number
  stripeCustomerId: string
  stripeSubscriptionId: string
  stripePriceId: string | null
  /** Stripe's own status string; `ACTIVE_SUBSCRIPTION_STATUSES` says which grant access. */
  status: string
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
}

export type SubscriptionInterval = "month" | "year"

/**
 * One of the pricing page's three cards. The two paid ones have their amount read live from
 * Stripe; the free one is a fixed zero, so all three render through the same card.
 */
export type PricingPlan = {
  name: string
  tagline: string
  benefits: string[]
  /** Already divided down from Stripe's minor units, e.g. 9.9 rather than 990. */
  amount: number | null
  currency: string | null
  /** Null only for the free plan — the pro plan always has one of the two intervals. */
  interval: SubscriptionInterval | null
}
