import { Link, useRouter } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { useSiteConfig } from "@/lib/hooks"
import type { SubscriptionInterval } from "@/types/subscription"

import { toIntervalPlanName, useBillingPortalRedirect } from "../../-lib/utils"

/**
 * A paid card's action. Four states — the plan they're already on, the one they could switch
 * to, signed out, and the actual checkout — kept out of `PricingPlanCard` so the free column
 * doesn't carry any of it.
 */
export function PricingPlanAction({
  account,
  interval,
  currentInterval,
  isSubscribed,
  trialEligible,
  highlighted,
  courseSlug,
}: {
  account: { id: number } | null
  interval: SubscriptionInterval
  /** Null for a subscriber on a price we no longer sell — they get the switch, not the badge. */
  currentInterval: SubscriptionInterval | null
  isSubscribed: boolean
  trialEligible: boolean
  highlighted: boolean
  courseSlug?: string
}) {
  const router = useRouter()
  const { pricing } = useSiteConfig()
  const { openBillingPortal, pendingFlow, error: portalError } = useBillingPortalRedirect()

  if (currentInterval === interval) {
    return (
      <Button
        className="h-11 w-full"
        render={<Link to="/settings">Manage subscription</Link>}
        nativeButton={false}
        variant="outline"
      />
    )
  }

  if (isSubscribed) {
    return (
      <div className="flex flex-col gap-2">
        <Button
          className="h-11 w-full"
          onClick={() => openBillingPortal(interval)}
          disabled={!!pendingFlow}
          variant={highlighted ? "default" : "outline"}
        >
          {pendingFlow ? "Opening..." : `Switch to ${toIntervalPlanName(pricing, interval)}`}
        </Button>
        {portalError && <p className="text-sm text-destructive">{portalError}</p>}
      </div>
    )
  }

  if (!account) {
    const next = router.buildLocation({
      to: "/pricing/subscribe",
      search: { plan: interval, courseSlug },
    }).href

    return (
      <Button
        className="h-11 w-full"
        render={
          <Link to="/login" search={{ next }} preload={false}>
            {trialEligible ? "Start Free Trial" : "Subscribe"}
          </Link>
        }
        nativeButton={false}
        variant={highlighted ? "default" : "outline"}
      />
    )
  }

  return (
    <Button
      className="h-11 w-full"
      render={
        <Link to="/pricing/subscribe" search={{ plan: interval, courseSlug }} preload={false}>
          {trialEligible ? "Start Free Trial" : "Subscribe"}
        </Link>
      }
      nativeButton={false}
      variant={highlighted ? "default" : "outline"}
    />
  )
}
