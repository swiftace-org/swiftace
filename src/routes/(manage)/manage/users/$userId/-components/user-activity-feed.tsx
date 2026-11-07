import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { UserActivity } from "@/types/user"

import { USER_ACTIVITY_LIMIT } from "../-lib/constants"
import { ActivityTimeline } from "../../../-components/activity-timeline"

export function UserActivityFeed({
  activity,
  username,
}: {
  activity: UserActivity[]
  username: string
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Activity</CardTitle>
        <CardDescription>
          {activity.length >= USER_ACTIVITY_LIMIT
            ? `The latest ${USER_ACTIVITY_LIMIT} events`
            : "Everything recorded for this account"}
        </CardDescription>
      </CardHeader>
      <CardContent className="max-h-[32rem] overflow-y-auto xl:max-h-[calc(100vh-12rem)]">
        <ActivityTimeline activity={activity} username={username} />
      </CardContent>
    </Card>
  )
}
