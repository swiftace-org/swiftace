import { Link } from "@tanstack/react-router"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { toSubmitErrorMessage } from "@/lib/utils"
import type { SiteActivity } from "@/types/user"

import { loadSiteActivity } from "../-functions/load-site-activity"
import { RECENT_ACTIVITY_LIMIT } from "../-lib/constants"
import { ActivityTimeline } from "./activity-timeline"
import { ActivityTimelineSkeleton } from "./activity-timeline-skeleton"

/** The latest learner activity (admins left out), loaded after the page renders like the metrics. */
export function RecentActivitySection() {
  const [activity, setActivity] = useState<SiteActivity[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isCurrent = true
    loadSiteActivity({ data: { cursor: null, limit: RECENT_ACTIVITY_LIMIT, includeAdmins: false } })
      .then((page) => isCurrent && setActivity(page.activity))
      .catch((loadError) => {
        if (isCurrent) setError(toSubmitErrorMessage(loadError, "Couldn't load recent activity."))
      })
    return () => {
      isCurrent = false
    }
  }, [])

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Recent Activity</h2>
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <Card size="sm">
          <CardContent>
            {activity ? (
              <ActivityTimeline activity={activity} />
            ) : (
              <ActivityTimelineSkeleton rows={8} />
            )}
          </CardContent>
        </Card>
      )}
      <Button
        variant="outline"
        size="sm"
        render={<Link to="/manage/activity">Show more</Link>}
        nativeButton={false}
      />
    </section>
  )
}
