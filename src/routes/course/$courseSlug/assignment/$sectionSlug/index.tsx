import { createFileRoute, getRouteApi } from "@tanstack/react-router"

import { CourseResourceNotebookSkeleton } from "@/components/notebook/course-resource-notebook"

import { fetchNotebookForSection } from "../../-functions/fetch-notebook-for-section"
import { CourseSectionNotes } from "../../../-components/course-section-notes"

const courseRoute = getRouteApi("/course/$courseSlug")

export const Route = createFileRoute("/course/$courseSlug/assignment/$sectionSlug/")({
  loader: ({ params }) => fetchNotebookForSection({ data: params }),
  pendingComponent: CourseResourceNotebookSkeleton,
  component: AssignmentNotesTab,
})

function AssignmentNotesTab() {
  const { sectionSlug } = Route.useParams()
  const { sections } = courseRoute.useLoaderData()
  const section = sections.find((s) => s.slug === sectionSlug)
  const notebookResource = Route.useLoaderData()

  if (!section) return null

  return <CourseSectionNotes section={section} notebookResource={notebookResource} />
}
