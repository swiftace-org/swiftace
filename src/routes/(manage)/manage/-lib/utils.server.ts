import { PENDING_SUBSCRIPTION_STATUSES } from "@/lib/config"
import type {
  MetricsPeriod,
  PeriodCounts,
  PeriodStarts,
  SubscriptionForMetrics,
} from "@/types/metrics"
import type { UserActivity, UserActivityRow } from "@/types/user"

import { METRICS_PERIODS } from "./constants"
import { emptyPeriodCounts } from "./utils"

const DAY_MS = 24 * 60 * 60 * 1000

/** Where each metrics period begins. Months start in UTC, like every time on these pages. */
export function toMetricsPeriodStarts(now: Date): Record<MetricsPeriod, Date> {
  return {
    "24h": new Date(now.getTime() - DAY_MS),
    "7d": new Date(now.getTime() - 7 * DAY_MS),
    "30d": new Date(now.getTime() - 30 * DAY_MS),
    month: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
  }
}

/**
 * New subscribers, renewals and cancellations per period. The table keeps no billing history, so
 * a renewal is the start of the current period — its end minus one interval — when that isn't
 * the first period; and a cancellation is dated by the row's last update, the webhook that ended
 * or scheduled the end of it.
 */
export function toSubscriptionCounts(
  subscriptions: SubscriptionForMetrics[],
  starts: PeriodStarts,
  annualPriceId: string,
): Record<"newSubscriptions" | "renewals" | "cancellations", PeriodCounts> {
  const counts = {
    newSubscriptions: emptyPeriodCounts(),
    renewals: emptyPeriodCounts(),
    cancellations: emptyPeriodCounts(),
  }

  for (const subscription of subscriptions) {
    if (PENDING_SUBSCRIPTION_STATUSES.includes(subscription.status)) continue
    const renewedAt = toLatestRenewal(subscription, annualPriceId)
    const isCanceled = subscription.status === "canceled" || subscription.cancelAtPeriodEnd

    for (const period of METRICS_PERIODS) {
      const start = starts[period]
      if (subscription.createdAt >= start) counts.newSubscriptions[period] += 1
      if (renewedAt && renewedAt >= start) counts.renewals[period] += 1
      if (isCanceled && subscription.updatedAt >= start) counts.cancellations[period] += 1
    }
  }
  return counts
}

/** A day of slack, since Stripe stamps the first period a few seconds before the row exists. */
const FIRST_PERIOD_TOLERANCE_MS = DAY_MS

function toLatestRenewal(subscription: SubscriptionForMetrics, annualPriceId: string): Date | null {
  if (!subscription.currentPeriodEnd) return null

  const periodStart = new Date(subscription.currentPeriodEnd)
  if (annualPriceId && subscription.stripePriceId === annualPriceId) {
    periodStart.setUTCFullYear(periodStart.getUTCFullYear() - 1)
  } else {
    periodStart.setUTCMonth(periodStart.getUTCMonth() - 1)
  }

  const isFirstPeriod =
    periodStart.getTime() - subscription.createdAt.getTime() < FIRST_PERIOD_TOLERANCE_MS
  return isFirstPeriod ? null : periodStart
}

export function toUserActivity(row: UserActivityRow): UserActivity {
  return {
    kind: row.kind,
    at: toUtcDate(row.at),
    courseSlug: row.course_slug,
    courseTitle: row.course_title,
    subject: row.subject,
    subjectSlug: row.subject_slug,
    detail: row.detail,
    count: row.count === null ? null : Number(row.count),
    extra: row.extra,
  }
}

/**
 * Drizzle hands raw `timestamp without time zone` values back as text, and the legacy app wrote
 * them in UTC — parsing the bare string would read them as the server's local time instead.
 */
function toUtcDate(value: string | Date): Date {
  if (value instanceof Date) return value
  return new Date(`${value.replace(" ", "T")}Z`)
}
