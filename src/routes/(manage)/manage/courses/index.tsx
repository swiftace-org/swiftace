import { createFileRoute } from "@tanstack/react-router"

import { Skeleton } from "@/components/ui/skeleton"

import { CoursesTable } from "./-components/courses-table"
import { CreateCourseForm } from "./-components/create-course-form"
import { loadManageCoursesPageData } from "./-functions/load-manage-courses-page-data"

export const Route = createFileRoute("/(manage)/manage/courses/")({
  loader: async () => loadManageCoursesPageData(),
  pendingComponent: ManagePagePending,
  component: ManagePage,
})

function ManagePage() {
  const { courses } = Route.useLoaderData()

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8">
      <ManageCoursesHeader />
      <CreateCourseForm />
      <CoursesTable courses={courses} />
    </main>
  )
}

function ManageCoursesHeader() {
  return (
    <div className="space-y-1">
      <h1 className="text-xl font-semibold">Manage Courses</h1>
      <p className="text-sm text-muted-foreground">
        Drag a course to change where it&apos;s listed on the home page.
      </p>
    </div>
  )
}

function ManagePagePending() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8">
      <ManageCoursesHeader />
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-full" />
        </div>
        <Skeleton className="h-9 w-20" />
      </div>
      <div className="space-y-2">
        <div className="flex gap-4 border-b pb-2">
          <Skeleton className="h-4 w-6" />
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 py-2">
            <Skeleton className="size-6 rounded-md" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="ml-auto size-8 rounded-md" />
          </div>
        ))}
      </div>
    </main>
  )
}
