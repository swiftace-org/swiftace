import { Sparkles } from "lucide-react"
import type { ComponentProps } from "react"

import { PRO_BADGE_CLASSES } from "@/components/pro-badge"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { ManagedUserSubscription, SubscriptionPlan } from "@/types/user"

import { STRIPE_DASHBOARD_URL, SUBSCRIPTION_PLAN_LABELS } from "../-lib/constants"

/** A hue per plan, so a scan down the column picks out who pays and how. */
const PLAN_CLASSES: Record<SubscriptionPlan, string> = {
  free: "bg-muted text-muted-foreground",
  monthly: PRO_BADGE_CLASSES,
  yearly: "bg-chart-2/15 text-chart-4 dark:bg-chart-2/20 dark:text-chart-1",
  pro: PRO_BADGE_CLASSES,
}

export function SubscriptionPlanBadge({
  plan,
  subscription,
}: {
  plan: SubscriptionPlan
  subscription: ManagedUserSubscription | null
}) {
  const badge = (
    <Badge
      render={
        subscription ? (
          <a
            href={`${STRIPE_DASHBOARD_URL}/subscriptions/${subscription.stripeSubscriptionId}`}
            target="_blank"
            rel="noreferrer"
            aria-label={`${SUBSCRIPTION_PLAN_LABELS[plan]}, open in Stripe`}
          />
        ) : undefined
      }
      className={cn(PLAN_CLASSES[plan], "[a]:hover:opacity-80")}
    >
      {plan === "free" ? null : <Sparkles />}
      {SUBSCRIPTION_PLAN_LABELS[plan]}
    </Badge>
  )

  if (!subscription?.trialing && !subscription?.canceling && !subscription?.paymentFailed) {
    return badge
  }

  return (
    <span className="inline-flex items-center gap-1">
      {badge}
      {subscription.trialing ? (
        <LetterBadge letter="T" label="Trialing" className="bg-warning/15 text-warning" />
      ) : null}
      {subscription.paymentFailed ? (
        <LetterBadge letter="F" label="Payment failed" variant="destructive" />
      ) : null}
      {subscription.canceling ? (
        <LetterBadge letter="C" label="Canceling" variant="destructive" />
      ) : null}
    </span>
  )
}

function LetterBadge({
  letter,
  label,
  ...props
}: { letter: string; label: string } & Pick<
  ComponentProps<typeof Badge>,
  "className" | "variant"
>) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Badge aria-label={label} {...props} />}>{letter}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
