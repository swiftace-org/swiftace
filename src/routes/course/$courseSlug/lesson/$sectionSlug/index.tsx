import { createFileRoute, getRouteApi } from "@tanstack/react-router"

import { CourseResourceNotebookSkeleton } from "@/components/notebook/course-resource-notebook"

import { fetchNotebookForSection } from "../../-functions/fetch-notebook-for-section"
import { CourseSectionNotes } from "../../../-components/course-section-notes"

const courseRoute = getRouteApi("/course/$courseSlug")

export const Route = createFileRoute("/course/$courseSlug/lesson/$sectionSlug/")({
  loader: ({ params }) => fetchNotebookForSection({ data: params }),
  pendingComponent: CourseResourceNotebookSkeleton,
  component: LessonNotesTab,
})

function LessonNotesTab() {
  const { sectionSlug } = Route.useParams()
  const { sections } = courseRoute.useLoaderData()
  const section = sections.find((s) => s.slug === sectionSlug)
  const notebookResource = Route.useLoaderData()

  if (!section) return null

  return <CourseSectionNotes section={section} notebookResource={notebookResource} />
}
