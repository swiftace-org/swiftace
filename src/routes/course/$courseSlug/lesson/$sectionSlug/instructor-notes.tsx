import { createFileRoute, getRouteApi } from "@tanstack/react-router"

import { ROBOTS_NOINDEX_META } from "@/lib/config"

import { CourseSectionInstructorNotes } from "../../../-components/course-section-instructor-notes"

const courseRoute = getRouteApi("/course/$courseSlug")

export const Route = createFileRoute("/course/$courseSlug/lesson/$sectionSlug/instructor-notes")({
  head: () => ({ meta: [ROBOTS_NOINDEX_META] }),
  component: LessonInstructorNotesTab,
})

function LessonInstructorNotesTab() {
  const { sectionSlug } = Route.useParams()
  const { sections } = courseRoute.useLoaderData()
  const section = sections.find((s) => s.slug === sectionSlug)

  return <CourseSectionInstructorNotes markup={section?.additionalInformationHtml ?? null} />
}
