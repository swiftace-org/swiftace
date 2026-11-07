import type { MetricKey, MetricsPeriod } from "@/types/metrics"
import type { ManageUsersRoleFilter } from "@/types/user"

export const METRICS_PERIODS: MetricsPeriod[] = ["24h", "7d", "30d", "month"]

export const METRICS_PERIOD_OPTIONS: { value: MetricsPeriod; label: string }[] = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "month", label: "This month" },
]

export const DEFAULT_METRICS_PERIOD: MetricsPeriod = "24h"

/** `usersRole` makes the card open /manage/users on that role filter ("all" for none). */
export const METRICS: { key: MetricKey; label: string; usersRole?: ManageUsersRoleFilter }[] = [
  { key: "activeUsers", label: "Active users" },
  { key: "signUps", label: "Sign ups", usersRole: "all" },
  { key: "enrollments", label: "Enrollments" },
  { key: "submissions", label: "Submissions" },
  { key: "newSubscriptions", label: "New Subscribers", usersRole: "subscribers" },
  { key: "renewals", label: "Renewals" },
  { key: "cancellations", label: "Cancellations" },
]

/** How much of the site-wide feed the dashboard shows before "Show more". */
export const RECENT_ACTIVITY_LIMIT = 20

export const MAX_SITE_ACTIVITY_LIMIT = 100
