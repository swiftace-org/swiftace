import { createFileRoute } from "@tanstack/react-router"

import { Skeleton } from "@/components/ui/skeleton"

import { EvaluationDashboardTable } from "./-components/evaluation-dashboard-table"
import { EvaluationDashboardToolbar } from "./-components/evaluation-dashboard-toolbar"
import { loadEvaluationDashboard } from "./-functions/load-evaluation-dashboard"
import { toEvaluationDashboardSearch } from "./-lib/utils"

export const Route = createFileRoute("/(manage)/manage/evaluate/")({
  validateSearch: toEvaluationDashboardSearch,
  // No `loaderDeps`: the filters are applied in the browser, so changing one must not
  // re-run the aggregate behind this page.
  loader: () => loadEvaluationDashboard(),
  pendingComponent: EvaluationDashboardPending,
  component: EvaluationDashboardPage,
})

function EvaluationDashboardPage() {
  const { assignments, courses } = Route.useLoaderData()
  const search = Route.useSearch()

  const pending = assignments.reduce((total, assignment) => total + assignment.counts.PENDING, 0)

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Manage Evaluations</h1>
        <p className="text-sm text-muted-foreground">
          {pending
            ? `${pending.toLocaleString("en-US")} ${pending === 1 ? "submission is" : "submissions are"} waiting to be evaluated.`
            : "Nothing is waiting to be evaluated."}
        </p>
      </div>
      <EvaluationDashboardToolbar search={search} courses={courses} />
      <div className="overflow-x-auto">
        <EvaluationDashboardTable assignments={assignments} search={search} />
      </div>
    </main>
  )
}

function EvaluationDashboardPending() {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-8">
      <div className="space-y-2">
        <Skeleton className="h-6 w-52" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Skeleton className="h-9 lg:w-64" />
        <Skeleton className="h-9 lg:w-64" />
        <Skeleton className="h-9 lg:w-40" />
        <Skeleton className="h-5 w-36" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-6 border-b pb-2">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="ml-auto h-4 w-20" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-24" />
        </div>
        {Array.from({ length: 10 }, (_, index) => (
          <div key={index} className="flex items-center gap-6 py-2">
            <div className="w-56 space-y-1.5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="ml-auto h-4 w-12" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="size-8 rounded-md" />
          </div>
        ))}
      </div>
    </main>
  )
}
