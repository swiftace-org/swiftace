import { createFileRoute, getRouteApi } from "@tanstack/react-router"

import { Skeleton } from "@/components/ui/skeleton"

import { AddParticipantForm } from "./-components/add-participant-form"
import { ParticipantsPagination } from "./-components/participants-pagination"
import { ParticipantsTable } from "./-components/participants-table"
import { ParticipantsToolbar } from "./-components/participants-toolbar"
import { loadCourseParticipants } from "./-functions/load-course-participants"
import { toCourseParticipantsSearch } from "./-lib/utils"

const manageRoute = getRouteApi("/course/$courseSlug_/manage")

export const Route = createFileRoute("/course/$courseSlug_/manage/participants/")({
  validateSearch: toCourseParticipantsSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ params, deps }) =>
    loadCourseParticipants({ data: { courseSlug: params.courseSlug, ...deps } }),
  // Filters live in the URL, so each one re-runs the loader. The router's 200ms default is
  // short enough that a filter change swaps the table for the skeleton and pulls focus out
  // of the search box mid-typing; a second is long enough that the current table just stays
  // put, and slow queries still get a skeleton.
  pendingMs: 1000,
  pendingComponent: ParticipantsPagePending,
  component: ParticipantsPage,
})

function ParticipantsPage() {
  const { course, sections } = manageRoute.useLoaderData()
  const page = Route.useLoaderData()
  const search = Route.useSearch()

  return (
    <div className="w-full space-y-6">
      <h1 className="text-xl font-semibold">Participants</h1>
      <AddParticipantForm courseSlug={course.slug} />
      <ParticipantsToolbar search={search} sections={sections} />
      <ParticipantsTable
        courseSlug={course.slug}
        courseTitle={course.title}
        page={page}
        search={search}
      />
      <ParticipantsPagination page={page} search={search} />
    </div>
  )
}

function ParticipantsPagePending() {
  return (
    <div className="w-full space-y-6">
      <Skeleton className="h-6 w-36" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2 sm:max-w-sm">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-full" />
        </div>
        <Skeleton className="h-9 w-20" />
      </div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Skeleton className="h-9 lg:w-64" />
        <Skeleton className="h-9 lg:w-44" />
        <Skeleton className="h-9 lg:w-56" />
        <Skeleton className="h-5 w-24" />
      </div>
      <div className="space-y-2">
        <div className="flex gap-6 border-b pb-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="flex items-center gap-6 py-2">
            <div className="w-40 space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="ml-auto h-8 w-16" />
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
