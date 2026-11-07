import { createFileRoute, getRouteApi } from "@tanstack/react-router"

import { Markdown } from "@/components/markdown"
import { VideoEmbed } from "@/components/video-embed"

import { CourseEnrollButton } from "../-components/course-enroll-button"
import { SectionCard } from "./-components/section-card"

const courseRoute = getRouteApi("/course/$courseSlug")

export const Route = createFileRoute("/course/$courseSlug/")({
  component: CourseIndexPage,
})

function CourseIndexPage() {
  const { course, sections, isEnrolled, courseProgress, certificateSlug } =
    courseRoute.useLoaderData()
  const { account } = courseRoute.useRouteContext()
  const openSections = sections.filter((section) => section.isOpen && !section.isLocked)
  const nextSection = openSections.find((section) => !section.isCompleted) ?? openSections[0]

  return (
    <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto">
      {course.videoUrl && <VideoEmbed src={course.videoUrl} />}
      {!course.videoUrl && course.cover && (
        <img className="rounded" src={course.cover} alt={course.title} />
      )}

      <h1 className="text-3xl font-semibold">{course.title}</h1>

      <CourseEnrollButton
        courseSlug={course.slug}
        isEnrolled={isEnrolled}
        isSignedIn={!!account}
        nextSection={nextSection}
        courseProgress={courseProgress}
        certificateSlug={certificateSlug}
      />

      {course.descriptionHtml && <Markdown markup={course.descriptionHtml} />}

      {sections.length > 0 && (
        <section className="flex flex-col border rounded-xl divide-y">
          {sections.map((section) => (
            <SectionCard key={section.id} section={section} courseSlug={course.slug} />
          ))}
        </section>
      )}

      {course.additionalInformationHtml && <Markdown markup={course.additionalInformationHtml} />}
    </div>
  )
}
