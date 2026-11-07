import { createServerFn } from "@tanstack/react-start"

import { adminMiddleware } from "@/lib/utils"
import { getSiteConfig } from "@/lib/utils.server"
import type { Metrics } from "@/types/metrics"

import {
  readActiveUserCounts,
  readEnrollmentCounts,
  readSignUpCounts,
  readSubmissionCounts,
  readSubscriptionsForMetrics,
} from "../-lib/db.server"
import { toMetricsPeriodStarts, toSubscriptionCounts } from "../-lib/utils.server"

/**
 * The admin dashboard's headline numbers, for every period at once. Fetched from the browser
 * once the page has rendered, so these aggregates never hold it up.
 */
export const loadMetrics = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async (): Promise<Metrics> => {
    // Read even while billing is off, so past subscriptions still count by their plan.
    const { annualPriceId } = (await getSiteConfig()).integrations.billing
    const starts = toMetricsPeriodStarts(new Date())

    const [activeUsers, signUps, enrollments, submissions, subscriptions] = await Promise.all([
      readActiveUserCounts(starts),
      readSignUpCounts(starts),
      readEnrollmentCounts(starts),
      readSubmissionCounts(starts),
      readSubscriptionsForMetrics(),
    ])

    return {
      activeUsers,
      signUps,
      enrollments,
      submissions,
      ...toSubscriptionCounts(subscriptions, starts, annualPriceId),
    }
  })
