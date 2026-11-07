import { useCallback, useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { toSubmitErrorMessage } from "@/lib/utils"
import type { SiteActivityPage } from "@/types/user"

import { SITE_ACTIVITY_PAGE_SIZE } from "../-lib/constants"
import { ActivityTimeline } from "../../-components/activity-timeline"
import { ActivityTimelineSkeleton } from "../../-components/activity-timeline-skeleton"
import { loadSiteActivity } from "../../-functions/load-site-activity"

/** Every account's activity, loading the next page as the end of the list scrolls into view. */
export function SiteActivityFeed({
  initialPage,
  includeAdmins,
}: {
  initialPage: SiteActivityPage
  includeAdmins: boolean
}) {
  const [activity, setActivity] = useState(initialPage.activity)
  const [nextCursor, setNextCursor] = useState(initialPage.nextCursor)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  // The observer can fire again before React re-renders with `isLoading` set.
  const isLoadingRef = useRef(false)

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoadingRef.current) return
    isLoadingRef.current = true
    setIsLoading(true)
    setError(null)
    try {
      const page = await loadSiteActivity({
        data: { cursor: nextCursor, limit: SITE_ACTIVITY_PAGE_SIZE, includeAdmins },
      })
      setActivity((current) => [...current, ...page.activity])
      setNextCursor(page.nextCursor)
    } catch (loadError) {
      setError(toSubmitErrorMessage(loadError, "Couldn't load more activity."))
    } finally {
      isLoadingRef.current = false
      setIsLoading(false)
    }
  }, [nextCursor, includeAdmins])

  // Re-observing after each page fires again while the end is still in view, filling the screen.
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !nextCursor || error) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore()
      },
      { rootMargin: "600px 0px" },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore, nextCursor, error])

  return (
    <Card size="sm">
      <CardContent className="space-y-4">
        <ActivityTimeline activity={activity} />
        {isLoading ? <ActivityTimelineSkeleton rows={3} /> : null}
        {error ? (
          <div className="flex items-center gap-3">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => void loadMore()}>
              Try again
            </Button>
          </div>
        ) : null}
        {!nextCursor && activity.length ? (
          <p className="text-sm text-muted-foreground">That&apos;s everything.</p>
        ) : null}
        <div ref={sentinelRef} aria-hidden />
      </CardContent>
    </Card>
  )
}
