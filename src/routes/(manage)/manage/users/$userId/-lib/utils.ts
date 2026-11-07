import type { SearchParamsInput } from "@/lib/utils"
import type { ManagedUserTab } from "@/types/user"

import { DEFAULT_MANAGED_USER_TAB, MANAGED_USER_TAB_VALUES } from "./constants"

export function toManagedUserSearch(search: SearchParamsInput<{ tab: ManagedUserTab }>): {
  tab: ManagedUserTab
} {
  return {
    tab: MANAGED_USER_TAB_VALUES.includes(search.tab as ManagedUserTab)
      ? (search.tab as ManagedUserTab)
      : DEFAULT_MANAGED_USER_TAB,
  }
}

/** Stripe amounts are in minor units; every currency charged so far has two decimals. */
export function formatMinorAmount(amount: number | null, currency: string | null): string {
  if (amount === null) return "—"
  if (!currency) return (amount / 100).toFixed(2)
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency }).format(amount / 100)
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`
  }
}
