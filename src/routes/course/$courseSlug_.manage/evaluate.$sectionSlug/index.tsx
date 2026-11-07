import { createFileRoute, notFound } from "@tanstack/react-router"
import { ExternalLink } from "lucide-react"

import { BlueLink } from "@/components/blue-link"
import { Skeleton } from "@/components/ui/skeleton"

import { SubmissionsPagination } from "./-components/submissions-pagination"
import { SubmissionsTable } from "./-components/submissions-table"
import { SubmissionsToolbar } from "./-components/submissions-toolbar"
import { loadAssignmentSubmissions } from "./-functions/load-assignment-submissions"
import { toAssignmentSubmissionsSearch } from "./-lib/utils"

export const Route = createFileRoute("/course/$courseSlug_/manage/evaluate/$sectionSlug/")({
  validateSearch: toAssignmentSubmissionsSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ params, deps }) => {
    const page = await loadAssignmentSubmissions({ data: { ...params, ...deps } })
    if (!page.assignment) throw notFound()
    return { ...page, assignment: page.assignment }
  },
  // Filters live in the URL, so each one re-runs the loader. The router's 200ms default is
  // short enough that a filter change swaps the table for the skeleton and pulls focus out
  // of the search box mid-typing; a second is long enough that the current table just stays
  // put, and slow queries still get a skeleton.
  pendingMs: 1000,
  pendingComponent: EvaluateAssignmentPagePending,
  component: EvaluateAssignmentPage,
})

function EvaluateAssignmentPage() {
  const page = Route.useLoaderData()
  const search = Route.useSearch()
  const { assignment } = page

  return (
    <div className="w-full space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">{assignment.assignmentTitle}</h1>
        <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
          <BlueLink
            to="/course/$courseSlug/assignment/$sectionSlug"
            params={{
              courseSlug: assignment.courseSlug,
              sectionSlug: assignment.assignmentSlug,
            }}
            target="_blank"
            className="gap-1"
          >
            View assignment
            <ExternalLink className="size-3.5" />
          </BlueLink>
        </p>
      </div>
      <SubmissionsToolbar search={search} statusCounts={page.statusCounts} />
      <SubmissionsTable submissions={page.submissions} search={search} />
      <SubmissionsPagination page={page} search={search} />
    </div>
  )
}

function EvaluateAssignmentPagePending() {
  return (
    <div className="w-full space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Skeleton className="h-9 lg:w-64" />
        <Skeleton className="h-8 w-80" />
      </div>
      <div className="space-y-2">
        <div className="flex gap-6 border-b pb-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="flex gap-6 py-4">
            <div className="w-40 space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-28" />
            </div>
            <div className="w-64 space-y-3">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-16 rounded-4xl" />
            <div className="w-72 space-y-2">
              <Skeleton className="h-16 w-full" />
              <div className="flex gap-1.5">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-8 w-48" />
      </div>
    </div>
  )
}
