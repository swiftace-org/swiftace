import { createFileRoute, stripSearchParams } from "@tanstack/react-router"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

import { UsersTable } from "./-components/users-table"
import { UsersToolbar } from "./-components/users-toolbar"
import { loadManageUsers } from "./-functions/load-manage-users"
import { DEFAULT_MANAGE_USERS_SEARCH, PAGE_GUTTER } from "./-lib/constants"
import { toManageUsersSearch } from "./-lib/utils"

export const Route = createFileRoute("/(manage)/manage/users/")({
  validateSearch: toManageUsersSearch,
  // Keeps a fresh visit at a bare `/manage/users` rather than redirecting to spell out defaults.
  search: { middlewares: [stripSearchParams(DEFAULT_MANAGE_USERS_SEARCH)] },
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => loadManageUsers({ data: deps }),
  // Filters live in the URL, so each keystroke re-runs the loader; a second keeps the current
  // table on screen (and focus in the search box) while a search scans the accounts table.
  pendingMs: 1000,
  pendingComponent: UsersPagePending,
  component: UsersPage,
})

function UsersPage() {
  const page = Route.useLoaderData()
  const search = Route.useSearch()

  return (
    <main className="w-full flex-1 space-y-6 py-8">
      <h1 className={cn("text-xl font-semibold", PAGE_GUTTER)}>Manage Users</h1>
      <div className={PAGE_GUTTER}>
        <UsersToolbar search={search} />
      </div>
      <UsersTable page={page} search={search} />
    </main>
  )
}

function UsersPagePending() {
  return (
    <main className="w-full flex-1 space-y-6 py-8">
      <div className={PAGE_GUTTER}>
        <Skeleton className="h-6 w-40" />
      </div>
      <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center", PAGE_GUTTER)}>
        <Skeleton className="h-9 sm:w-80" />
        <Skeleton className="h-9 sm:w-44" />
      </div>
      <div className="space-y-2">
        <div className={cn("flex items-center gap-6 border-b pb-2", PAGE_GUTTER)}>
          <Skeleton className="h-4 w-48" />
          <Skeleton className="hidden h-4 w-56 md:block" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="ml-auto hidden h-4 w-20 sm:block" />
        </div>
        {Array.from({ length: 12 }, (_, index) => (
          <div key={index} className={cn("flex items-center gap-6 py-2", PAGE_GUTTER)}>
            <div className="flex w-48 items-center gap-3">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <Skeleton className="hidden h-4 w-56 md:block" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="ml-auto hidden h-4 w-6 sm:block" />
          </div>
        ))}
      </div>
      <div
        className={cn(
          "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
          PAGE_GUTTER,
        )}
      >
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-8 w-48" />
      </div>
    </main>
  )
}
