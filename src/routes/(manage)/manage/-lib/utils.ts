import type { PeriodCounts } from "@/types/metrics"

export function emptyPeriodCounts(): PeriodCounts {
  return { "24h": 0, "7d": 0, "30d": 0, month: 0 }
}
