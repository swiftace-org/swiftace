import { createFileRoute, getRouteApi } from "@tanstack/react-router"

import { CourseDetailsForm } from "./-components/course-details-form"

const manageRoute = getRouteApi("/course/$courseSlug_/manage")

export const Route = createFileRoute("/course/$courseSlug_/manage/details")({
  component: CourseDetailsPage,
})

function CourseDetailsPage() {
  const { course } = manageRoute.useLoaderData()

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold">Course Details</h1>
      <CourseDetailsForm course={course} />
    </div>
  )
}
