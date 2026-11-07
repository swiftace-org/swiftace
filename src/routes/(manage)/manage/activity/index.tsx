import { createFileRoute, stripSearchParams } from "@tanstack/react-router"
import { ChevronLeft } from "lucide-react"

import { BlueLink } from "@/components/blue-link"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"

import { ActivityTimelineSkeleton } from "../-components/activity-timeline-skeleton"
import { loadSiteActivity } from "../-functions/load-site-activity"
import { SiteActivityFeed } from "./-components/site-activity-feed"
import { DEFAULT_SITE_ACTIVITY_SEARCH, SITE_ACTIVITY_PAGE_SIZE } from "./-lib/constants"
import { toSiteActivitySearch } from "./-lib/utils"

export const Route = createFileRoute("/(manage)/manage/activity/")({
  validateSearch: toSiteActivitySearch,
  search: { middlewares: [stripSearchParams(DEFAULT_SITE_ACTIVITY_SEARCH)] },
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) =>
    loadSiteActivity({
      data: { cursor: null, limit: SITE_ACTIVITY_PAGE_SIZE, includeAdmins: deps.admins },
    }),
  head: () => ({ meta: [{ title: "Recent Activity — Manage" }] }),
  pendingComponent: ActivityPagePending,
  component: ActivityPage,
})

function ActivityPage() {
  const page = Route.useLoaderData()
  const { admins } = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8">
      <ActivityPageHeader />
      <div className="flex items-center gap-2">
        <Checkbox
          id="include-admins"
          checked={admins}
          onCheckedChange={(checked) =>
            navigate({ search: { admins: checked === true }, replace: true })
          }
        />
        <Label htmlFor="include-admins">Include admin activity</Label>
      </div>
      {/* A fresh feed per filter, so the pages already scrolled through don't carry over. */}
      <SiteActivityFeed key={String(admins)} initialPage={page} includeAdmins={admins} />
    </main>
  )
}

function ActivityPageHeader() {
  return (
    <div className="space-y-2">
      <BlueLink to="/manage" className="gap-1 text-sm text-muted-foreground">
        <ChevronLeft className="size-4" />
        Manage
      </BlueLink>
      <h1 className="text-xl font-semibold">Recent Activity</h1>
    </div>
  )
}

function ActivityPagePending() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8">
      <ActivityPageHeader />
      <div className="flex items-center gap-2">
        <Skeleton className="size-4 rounded-sm" />
        <Skeleton className="h-4 w-40" />
      </div>
      <Card size="sm">
        <CardContent>
          <ActivityTimelineSkeleton rows={12} />
        </CardContent>
      </Card>
    </main>
  )
}
