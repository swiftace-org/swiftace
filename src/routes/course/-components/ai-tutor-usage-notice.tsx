import { Link } from "@tanstack/react-router"
import { HourglassIcon, SparklesIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress"
import { useSiteConfig } from "@/lib/hooks"
import type { AiTutorUsage } from "@/types/ai-tutor"

import { AI_TUTOR_WINDOW_LABELS, formatResetTime } from "../-lib/ai-tutor"
import { AI_TUTOR_USAGE_NOTICE_PERCENT } from "../-lib/constants"

/**
 * Where the learner stands against their limits: nothing until they're halfway through one, a bar
 * from there, and in place of the input once they're out — with a way up if there is one.
 */
export function AiTutorUsageNotice({
  usage,
  courseSlug,
}: {
  usage: AiTutorUsage
  courseSlug: string
}) {
  const { aiTutor, integrations } = useSiteConfig()
  const canUpgrade = usage.plan === "free" && integrations.billing.enabled

  if (!usage.planEnabled && !usage.unlimited) {
    return (
      <Notice
        icon={<SparklesIcon />}
        title={`${aiTutor.name} is part of the Pro plan`}
        description="Upgrade to ask questions about every lesson, get help with assignments and more."
        action={canUpgrade && <UpgradeLink courseSlug={courseSlug} />}
      />
    )
  }

  if (usage.blockedBy?.resetsAt) {
    const label = AI_TUTOR_WINDOW_LABELS[usage.blockedBy.kind]
    return (
      <Notice
        icon={<HourglassIcon />}
        title={`You've reached your ${label} limit`}
        description={`You can chat with ${aiTutor.name} again at ${formatResetTime(usage.blockedBy.resetsAt)}.${canUpgrade ? " Upgrade to Pro for higher limits." : ""}`}
        action={canUpgrade && <UpgradeLink courseSlug={courseSlug} />}
      />
    )
  }

  if (usage.unlimited) return null
  const nearest = usage.windows
    .filter((window) => window.resetsAt && window.percentUsed >= AI_TUTOR_USAGE_NOTICE_PERCENT)
    .sort((a, b) => b.percentUsed - a.percentUsed)[0]
  if (!nearest?.resetsAt) return null

  return (
    <Progress value={Math.min(nearest.percentUsed, 100)} className="gap-1.5 px-1 text-xs">
      <ProgressLabel className="text-xs font-normal text-muted-foreground">
        {nearest.percentUsed}% of your {AI_TUTOR_WINDOW_LABELS[nearest.kind]} limit used
      </ProgressLabel>
      <ProgressValue className="text-xs">
        {() => `Resets ${formatResetTime(nearest.resetsAt as Date)}`}
      </ProgressValue>
    </Progress>
  )
}

function Notice({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg bg-muted p-3 text-sm">
      <div className="flex gap-2.5">
        <span className="mt-0.5 text-muted-foreground [&_svg]:size-4">{icon}</span>
        <div className="flex flex-col gap-0.5">
          <p className="font-medium">{title}</p>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </div>
      {action}
    </div>
  )
}

function UpgradeLink({ courseSlug }: { courseSlug: string }) {
  return (
    <Button
      render={
        <Link to="/pricing" search={{ courseSlug }}>
          <SparklesIcon />
          Upgrade to Pro
        </Link>
      }
      nativeButton={false}
      size="sm"
      className="self-start"
    />
  )
}
