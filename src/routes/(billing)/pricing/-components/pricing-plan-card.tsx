import { Check } from "lucide-react"
import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { PricingPlan } from "@/types/subscription"

import { formatYearlyPricePerMonth } from "../-lib/utils"
import { formatSubscriptionPrice } from "../../-lib/utils"

/** The action is a slot so display stays independent of checkout and subscription state. */
export function PricingPlanCard({
  plan,
  highlighted = false,
  isCurrentPlan = false,
  badge,
  action,
  actionNote,
}: {
  plan: PricingPlan
  /** Draws the eye to the paid column without dimming the free one. */
  highlighted?: boolean
  isCurrentPlan?: boolean
  badge?: string
  action: ReactNode
  actionNote: string
}) {
  const price = formatSubscriptionPrice(plan)
  const pricePerMonth = plan.interval === "year" ? formatYearlyPricePerMonth(plan) : null

  return (
    <Card
      className={cn(
        "flex w-full flex-col gap-6 rounded-2xl py-7 shadow-none",
        highlighted ? "bg-primary/5 ring-2 ring-primary" : "ring-1 ring-border",
      )}
    >
      <CardHeader className="flex flex-col gap-3">
        <div className="flex min-h-7 flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">{plan.name}</h2>
          {(isCurrentPlan || badge) && (
            <Badge variant={isCurrentPlan || highlighted ? "default" : "secondary"}>
              {isCurrentPlan ? "Current plan" : badge}
            </Badge>
          )}
        </div>
        <p className="min-h-10 text-sm leading-5 text-muted-foreground">{plan.tagline}</p>
        <div className="pt-2">
          {price ? (
            <>
              <p className="flex items-baseline gap-1.5">
                <span className="text-5xl font-semibold tracking-tight">
                  {pricePerMonth ?? price}
                </span>
                <span className="text-sm text-muted-foreground">
                  {plan.interval ? "/ month" : "forever"}
                </span>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {plan.interval === "year"
                  ? `${price} billed yearly`
                  : plan.interval === "month"
                    ? "Billed monthly"
                    : "No subscription needed"}
              </p>
            </>
          ) : (
            <div className="flex min-h-20 flex-col justify-center gap-2 text-muted-foreground">
              <p className="font-medium">Price temporarily unavailable</p>
              <p className="text-sm">Refresh to see the latest pricing.</p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-6">
        <div className="flex flex-col gap-3">
          {action}
          <p className="text-center text-xs text-muted-foreground">{actionNote}</p>
        </div>
        <div className="border-t border-border/60 pt-6">
          <p className="mb-4 text-sm font-medium">
            {plan.interval ? "Everything in Free, plus:" : "A place to start:"}
          </p>
          <ul className="flex flex-col gap-3.5">
            {plan.benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3">
                <Check
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    highlighted ? "text-primary" : "text-muted-foreground",
                  )}
                  aria-hidden
                />
                <span className="text-sm leading-5">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
