import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { useSiteConfig } from "@/lib/hooks"
import type { SubscriptionInterval } from "@/types/subscription"

import {
  formatSubscriptionPrice,
  toIntervalPlanName,
  toSubscriptionPlanName,
  useBillingPortalRedirect,
} from "../../-lib/utils"

export function SubscriptionSettings({
  isSubscribed,
  isTrialing,
  interval,
  amount,
  currency,
  currentPeriodEnd,
  cancelAtPeriodEnd,
}: {
  isSubscribed: boolean
  isTrialing: boolean
  interval: SubscriptionInterval | null
  amount: number | null
  currency: string | null
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
}) {
  const { openBillingPortal, pendingFlow, error } = useBillingPortalRedirect()

  const config = useSiteConfig()
  const planName = interval
    ? toIntervalPlanName(config.pricing, interval)
    : toSubscriptionPlanName(config)
  const price = formatSubscriptionPrice({ amount, currency })
  // Nothing to offer a subscriber on a price we no longer sell, or one already on their way out —
  // they need the portal itself to resume before a switch would mean anything.
  const switchTo = cancelAtPeriodEnd ? null : interval === "month" ? "year" : "month"

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium">Subscription</h2>

      {isSubscribed ? (
        <>
          <p className="text-sm text-muted-foreground">
            {isTrialing ? `You're trying ${planName} for free` : `You're on ${planName}`}
            {price &&
              interval &&
              ` — ${price} per ${interval}${isTrialing ? " after your trial" : ""}`}
            {currentPeriodEnd &&
              `${cancelAtPeriodEnd ? ", ending " : isTrialing ? ", trial ends " : ", renewing "}${formatRenewalDate(currentPeriodEnd)}`}
            .
          </p>
          {interval && switchTo && (
            <Button onClick={() => openBillingPortal(switchTo)} disabled={!!pendingFlow}>
              {pendingFlow === switchTo
                ? "Opening..."
                : `Switch to ${toIntervalPlanName(config.pricing, switchTo)}`}
            </Button>
          )}
          <Button onClick={() => openBillingPortal()} disabled={!!pendingFlow} variant="outline">
            {pendingFlow === "manage" ? "Opening..." : "Manage billing"}
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Subscribe to enroll in courses, submit assignments and earn certificates.
          </p>
          <Button render={<Link to="/pricing">View plans</Link>} nativeButton={false} />
        </>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </section>
  )
}

function formatRenewalDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date))
}
