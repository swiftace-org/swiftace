import { createFileRoute, notFound, stripSearchParams } from "@tanstack/react-router"
import { ChevronLeft } from "lucide-react"

import { BlueLink } from "@/components/blue-link"
import { Skeleton } from "@/components/ui/skeleton"

import { UserActivityFeed } from "./-components/user-activity-feed"
import { UserProfileHeader } from "./-components/user-profile-header"
import { UserStats } from "./-components/user-stats"
import { UserTabs } from "./-components/user-tabs"
import { loadManageUser } from "./-functions/load-manage-user"
import { DEFAULT_MANAGED_USER_TAB } from "./-lib/constants"
import { toManagedUserSearch } from "./-lib/utils"

export const Route = createFileRoute("/(manage)/manage/users/$userId/")({
  validateSearch: toManagedUserSearch,
  search: { middlewares: [stripSearchParams({ tab: DEFAULT_MANAGED_USER_TAB })] },
  loader: async ({ params }) => {
    const overview = await loadManageUser({ data: { userId: Number(params.userId) } })
    if (!overview) throw notFound()
    return overview
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.profile.name} — Manage Users` : "Manage Users" }],
  }),
  pendingComponent: UserPagePending,
  component: UserPage,
})

function UserPage() {
  const overview = Route.useLoaderData()
  const { tab } = Route.useSearch()

  return (
    <main className="w-full flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <BackLink />
      <UserProfileHeader
        profile={overview.profile}
        lastActiveAt={overview.activity[0]?.at ?? null}
      />
      <UserStats overview={overview} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <UserTabs overview={overview} tab={tab} />
        <UserActivityFeed activity={overview.activity} username={overview.profile.username} />
      </div>
    </main>
  )
}

function BackLink() {
  return (
    <BlueLink to="/manage/users" className="gap-1 text-sm text-muted-foreground">
      <ChevronLeft className="size-4" />
      All users
    </BlueLink>
  )
}

function UserPagePending() {
  return (
    <main className="w-full flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <BackLink />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Skeleton className="size-14 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
          <Skeleton className="h-4 w-64 max-w-full" />
          <Skeleton className="h-5 w-72 max-w-full" />
        </div>
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-[76px] rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-4">
          <div className="flex gap-4">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-8 w-24" />
            ))}
          </div>
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="flex items-center gap-6 py-2">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="ml-auto size-8 rounded-md" />
            </div>
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </main>
  )
}
