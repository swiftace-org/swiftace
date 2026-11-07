import { createFileRoute, getRouteApi } from "@tanstack/react-router"

import { AddCourseSectionForm } from "./-components/add-course-section-form"
import { CourseSectionsTable } from "./-components/course-sections-table"

const manageRoute = getRouteApi("/course/$courseSlug_/manage")

export const Route = createFileRoute("/course/$courseSlug_/manage/")({
  component: CourseSectionsPage,
})

function CourseSectionsPage() {
  const { course, sections } = manageRoute.useLoaderData()

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold">Course Sections</h1>
      <AddCourseSectionForm courseSlug={course.slug} />
      <CourseSectionsTable courseSlug={course.slug} sections={sections} />
    </div>
  )
}
