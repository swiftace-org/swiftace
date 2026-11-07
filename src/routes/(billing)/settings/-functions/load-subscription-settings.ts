import { createServerFn } from "@tanstack/react-start"

import { readActiveSubscriptionByAccountId } from "@/lib/db.server"
import { authMiddleware } from "@/lib/utils"
import type { SubscriptionInterval } from "@/types/subscription"

import { readIntervalForPriceId, readSubscriptionPlans } from "../../-lib/utils.server"

/**
 * The subscription summary shown in settings — what they pay, when it renews, and which plan
 * they could switch to. Only the facts the card renders, rather than the whole row: Stripe ids
 * have no business reaching the browser.
 */
export const loadSubscriptionSettings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(
    async ({
      context,
    }): Promise<{
      isSubscribed: boolean
      isTrialing: boolean
      interval: SubscriptionInterval | null
      amount: number | null
      currency: string | null
      currentPeriodEnd: Date | null
      cancelAtPeriodEnd: boolean
    }> => {
      const subscription = await readActiveSubscriptionByAccountId(context.account.id)
      const interval = await readIntervalForPriceId(subscription?.stripePriceId ?? null)
      // Cached per price id after the first read, so this costs the settings page nothing.
      const plan = interval ? (await readSubscriptionPlans())[interval] : null

      return {
        isSubscribed: !!subscription,
        isTrialing: subscription?.status === "trialing",
        interval,
        amount: plan?.amount ?? null,
        currency: plan?.currency ?? null,
        currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
        cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
      }
    },
  )
