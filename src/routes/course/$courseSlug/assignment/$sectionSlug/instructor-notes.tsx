import { createFileRoute, getRouteApi } from "@tanstack/react-router"

import { ROBOTS_NOINDEX_META } from "@/lib/config"

import { CourseSectionInstructorNotes } from "../../../-components/course-section-instructor-notes"

const courseRoute = getRouteApi("/course/$courseSlug")

export const Route = createFileRoute(
  "/course/$courseSlug/assignment/$sectionSlug/instructor-notes",
)({
  head: () => ({ meta: [ROBOTS_NOINDEX_META] }),
  component: AssignmentInstructorNotesTab,
})

function AssignmentInstructorNotesTab() {
  const { sectionSlug } = Route.useParams()
  const { sections } = courseRoute.useLoaderData()
  const section = sections.find((s) => s.slug === sectionSlug)

  return <CourseSectionInstructorNotes markup={section?.additionalInformationHtml ?? null} />
}
