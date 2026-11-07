import { createServerFn } from "@tanstack/react-start"

import { readActiveSubscriptionByAccountId } from "@/lib/db.server"
import { integrationMiddleware } from "@/lib/utils"
import { getCurrentAccount, getSiteConfig } from "@/lib/utils.server"
import type { PricingPlan, SubscriptionInterval } from "@/types/subscription"

import { readLatestSubscriptionByAccountId } from "../../-lib/db.server"
import { readIntervalForPriceId, readSubscriptionPlans } from "../../-lib/utils.server"

/**
 * The three cards, plus which of them this visitor is already on — `currentInterval` stays null
 * for a subscriber grandfathered onto a price we no longer sell, so `isSubscribed` is asked
 * separately. Signed-out visitors can read the page, so this can't use `authMiddleware`.
 */
export const loadPricingPageData = createServerFn({ method: "GET" })
  .middleware([integrationMiddleware("billing")])
  .handler(
    async (): Promise<{
      freePlan: PricingPlan
      monthlyPlan: PricingPlan
      yearlyPlan: PricingPlan
      isSubscribed: boolean
      trialEligible: boolean
      currentInterval: SubscriptionInterval | null
    }> => {
      const account = await getCurrentAccount()
      const [{ month, year }, subscription, previous, { pricing }] = await Promise.all([
        readSubscriptionPlans(),
        account ? readActiveSubscriptionByAccountId(account.id) : Promise.resolve(null),
        account ? readLatestSubscriptionByAccountId(account.id) : Promise.resolve(null),
        getSiteConfig(),
      ])

      return {
        // There's no Stripe price behind the free tier, so it's all copy.
        freePlan: {
          name: pricing.freePlanName,
          tagline: pricing.freePlanTagline,
          benefits: pricing.freePlanBenefits,
          amount: 0,
          currency: null,
          interval: null,
        },
        monthlyPlan: month,
        yearlyPlan: year,
        isSubscribed: !!subscription,
        trialEligible: pricing.trialEnabled && !previous,
        currentInterval: await readIntervalForPriceId(subscription?.stripePriceId ?? null),
      }
    },
  )
