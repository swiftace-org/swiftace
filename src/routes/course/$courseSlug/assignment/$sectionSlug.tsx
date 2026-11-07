import { Outlet, createFileRoute, getRouteApi } from "@tanstack/react-router"

import { CourseResourceNotebookSkeleton } from "@/components/notebook/course-resource-notebook"
import { Skeleton } from "@/components/ui/skeleton"
import { VideoEmbed } from "@/components/video-embed"

import { SectionCompletedChip } from "../-components/section-completed-chip"
import { SectionLockedNotice } from "../-components/section-locked-notice"
import { AssignmentTabs } from "./-components/assignment-tabs"
import { loadAssignmentSubmission } from "./-functions/load-assignment-submission"

const courseRoute = getRouteApi("/course/$courseSlug")

/**
 * The layout both assignment tabs sit under, and the owner of the Submit tab's data. Loading it
 * here lets the tab strip know whether the assignment takes submissions, and means a new
 * submission is picked up by one `router.invalidate()` from the form.
 */
export const Route = createFileRoute("/course/$courseSlug/assignment/$sectionSlug")({
  loader: ({ params }) => loadAssignmentSubmission({ data: params }),
  pendingComponent: AssignmentPagePending,
  component: AssignmentPage,
})

function AssignmentPage() {
  const { courseSlug } = courseRoute.useParams()
  const { sectionSlug } = Route.useParams()
  const { sections } = courseRoute.useLoaderData()
  const { requirements } = Route.useLoaderData()
  const section = sections.find((s) => s.slug === sectionSlug)

  if (!section) return null
  if (section.isLocked) {
    return <SectionLockedNotice courseSlug={courseSlug} sectionType="assignment" />
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-3xl mx-auto">
      {section.videoUrl && <VideoEmbed src={section.videoUrl} />}
      {/* An assignment is completed by a passing evaluation, so there's a tick but no button. */}
      {section.isCompleted && <SectionCompletedChip />}
      {/* An assignment with nothing to submit is just notes, so it gets no tab strip. */}
      {(requirements.length > 0 || section.additionalInformationHtml) && (
        <AssignmentTabs
          courseSlug={courseSlug}
          sectionSlug={sectionSlug}
          showSubmit={requirements.length > 0}
          showInstructorNotes={!!section.additionalInformationHtml}
        />
      )}
      <Outlet />
    </div>
  )
}

function AssignmentPagePending() {
  const { sectionSlug } = Route.useParams()
  const { sections } = courseRoute.useLoaderData()
  const section = sections.find((s) => s.slug === sectionSlug)

  return (
    <div className="flex flex-col gap-4 w-full max-w-3xl mx-auto">
      {section?.videoUrl && <Skeleton className="aspect-video w-full rounded" />}
      <div className="flex gap-2">
        <Skeleton className="h-11 w-24 rounded" />
        <Skeleton className="h-11 w-24 rounded" />
      </div>
      <CourseResourceNotebookSkeleton />
    </div>
  )
}
