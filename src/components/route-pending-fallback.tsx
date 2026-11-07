import { Skeleton } from "@/components/ui/skeleton"

/** Generic full-page skeleton shown while a route without its own `pendingComponent` is loading. */
export function RoutePendingFallback() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-6">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  )
}
