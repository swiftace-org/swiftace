import { Outlet, createFileRoute, getRouteApi } from "@tanstack/react-router"

import { CourseResourceNotebookSkeleton } from "@/components/notebook/course-resource-notebook"
import { Skeleton } from "@/components/ui/skeleton"
import { VideoEmbed } from "@/components/video-embed"

import { SectionLockedNotice } from "../-components/section-locked-notice"
import { LessonCompletion } from "./-components/lesson-completion"
import { LessonTabs } from "./-components/lesson-tabs"

const courseRoute = getRouteApi("/course/$courseSlug")

export const Route = createFileRoute("/course/$courseSlug/lesson/$sectionSlug")({
  pendingComponent: LessonPageSkeleton,
  component: LessonPage,
})

function LessonPage() {
  const { courseSlug } = courseRoute.useParams()
  const { sectionSlug } = Route.useParams()
  const { sections, isEnrolled } = courseRoute.useLoaderData()
  const section = sections.find((s) => s.slug === sectionSlug)

  if (!section) return null
  if (section.isLocked) {
    return <SectionLockedNotice courseSlug={courseSlug} sectionType="lesson" />
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-3xl mx-auto">
      {section.videoUrl && <VideoEmbed src={section.videoUrl} />}
      {(section.quizUrl || section.additionalInformationHtml) && (
        <LessonTabs
          courseSlug={courseSlug}
          sectionSlug={sectionSlug}
          showQuestions={!!section.quizUrl}
          showInstructorNotes={!!section.additionalInformationHtml}
        />
      )}
      <Outlet />
      <LessonCompletion
        courseSlug={courseSlug}
        sectionSlug={sectionSlug}
        isEnrolled={isEnrolled}
        isCompleted={section.isCompleted}
        requireQuestions={!!section.requireQuestions}
      />
    </div>
  )
}

function LessonPageSkeleton() {
  return (
    <div className="flex flex-col gap-4 w-full max-w-3xl mx-auto">
      <Skeleton className="aspect-video w-full rounded" />
      <div className="flex gap-2">
        <Skeleton className="h-11 w-24 rounded" />
        <Skeleton className="h-11 w-28 rounded" />
      </div>
      <CourseResourceNotebookSkeleton />
    </div>
  )
}
