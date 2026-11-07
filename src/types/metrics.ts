export type MetricsPeriod = "24h" | "7d" | "30d" | "month"

export type MetricKey =
  | "activeUsers"
  | "signUps"
  | "enrollments"
  | "submissions"
  | "newSubscriptions"
  | "renewals"
  | "cancellations"

/** Every metric for every period at once, so switching periods needs no refetch. */
export type Metrics = Record<MetricKey, Record<MetricsPeriod, number>>

export type PeriodStarts = Record<MetricsPeriod, Date>

export type PeriodCounts = Record<MetricsPeriod, number>

export type SubscriptionForMetrics = {
  createdAt: Date
  updatedAt: Date
  status: string
  stripePriceId: string | null
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
}
