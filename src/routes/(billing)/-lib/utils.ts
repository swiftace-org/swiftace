import { useState } from "react"

import { toSubmitErrorMessage } from "@/lib/utils"
import type { SubscriptionInterval } from "@/types/subscription"

import { submitBillingPortalSession } from "../-functions/submit-billing-portal-session"

/**
 * The one paid plan's full name, as set in `/manage/config` or else named after the site. Its
 * price lives in Stripe rather than here — the pricing page reads it through `readSubscriptionPlans`.
 */
export function toSubscriptionPlanName(config: {
  general: { siteName: string }
  pricing: { planName: string }
}): string {
  return config.pricing.planName || `${config.general.siteName} Pro`
}

/** The same plan billed either way, by the shorter names its two pricing cards carry. */
export function toIntervalPlanName(
  pricing: { monthlyPlanName: string; yearlyPlanName: string },
  interval: SubscriptionInterval,
): string {
  return interval === "year" ? pricing.yearlyPlanName : pricing.monthlyPlanName
}

/**
 * The plan's price as Stripe quotes it, e.g. `$9`. The currency comes from the Stripe price
 * rather than a constant here, so switching the plan to another one doesn't need a deploy.
 * Whole amounts drop the decimals — `$9` reads better on a pricing page than `$9.00`.
 */
export function formatSubscriptionPrice(plan: {
  amount: number | null
  currency: string | null
}): string | null {
  if (plan.amount == null) return null

  const fractionDigits = Number.isInteger(plan.amount) ? 0 : 2
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (plan.currency ?? "usd").toUpperCase(),
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(plan.amount)
}

/** Which portal trip is in flight — the plain one, or the confirm screen for an interval. */
type BillingPortalFlow = SubscriptionInterval | "manage"

/**
 * Sends the browser off to Stripe's hosted portal, either to its home or straight to the
 * confirm screen for `interval`. Shared because both pricing and settings offer the switch.
 */
export function useBillingPortalRedirect() {
  const [pendingFlow, setPendingFlow] = useState<BillingPortalFlow>()
  const [error, setError] = useState<string>()

  async function openBillingPortal(interval?: SubscriptionInterval) {
    setPendingFlow(interval ?? "manage")
    setError(undefined)

    try {
      const result = await submitBillingPortalSession({ data: { interval } })
      if ("error" in result) {
        setError(result.error)
        setPendingFlow(undefined)
        return
      }
      // A full page load rather than a router navigation: the destination is Stripe's. The
      // pending flag stays set so the button doesn't flash back to idle mid-redirect.
      window.location.href = result.url
    } catch (error) {
      setError(toSubmitErrorMessage(error, "Failed to open the billing portal."))
      setPendingFlow(undefined)
    }
  }

  return { openBillingPortal, pendingFlow, error }
}
