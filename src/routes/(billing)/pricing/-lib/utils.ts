import { formatSubscriptionPrice } from "../../-lib/utils"

/**
 * How much cheaper the yearly plan is per month, e.g. 20 for "Save 20%". Null when either
 * price failed to load, or the yearly plan isn't actually cheaper.
 */
export function calculateYearlySavingsPercent(
  monthlyPlan: { amount: number | null },
  yearlyPlan: { amount: number | null },
): number | null {
  if (monthlyPlan.amount == null || !yearlyPlan.amount) return null

  const yearlyAsMonthly = yearlyPlan.amount / 12
  const savings = Math.round((1 - yearlyAsMonthly / monthlyPlan.amount) * 100)
  return savings > 0 ? savings : null
}

/**
 * The yearly plan quoted per month, e.g. `$7.50` — the comparison a visitor makes against the
 * monthly card once the two prices sit side by side rather than behind a toggle.
 */
export function formatYearlyPricePerMonth(yearlyPlan: {
  amount: number | null
  currency: string | null
}): string | null {
  if (yearlyPlan.amount == null) return null

  return formatSubscriptionPrice({ amount: yearlyPlan.amount / 12, currency: yearlyPlan.currency })
}
