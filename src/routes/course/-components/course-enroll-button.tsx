import { Link, useLocation, useRouter } from "@tanstack/react-router"
import { ArrowRight, Award, Sparkles } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { toSubmitErrorMessage } from "@/lib/utils"
import type { CourseSectionWithDescription } from "@/types/course"

import { submitCourseEnrollment } from "../-functions/submit-course-enrollment"
import { CourseProgress } from "./course-progress"
import { UpgradeRequiredDialog } from "./upgrade-required-dialog"

/**
 * The course page's call to action, which is the only place the subscription is enforced.
 *
 * Five states, in the order they're checked: already enrolled, signed out, mid-request,
 * and then the two outcomes of clicking — enrolled outright, or the upgrade dialog, so
 * subscribing (from its "View Plans" button) lands them right back here, enrolled.
 */
export function CourseEnrollButton({
  courseSlug,
  isEnrolled,
  isSignedIn,
  nextSection,
  courseProgress,
  certificateSlug,
}: {
  courseSlug: string
  isEnrolled: boolean
  isSignedIn: boolean
  /** Where "Continue learning" goes — the first section they haven't finished. */
  nextSection: CourseSectionWithDescription | undefined
  courseProgress: number
  certificateSlug: string | null
}) {
  const next = useLocation({ select: (location) => location.href })
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string>()
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)

  async function handleEnroll() {
    setIsSubmitting(true)
    setError(undefined)

    try {
      const result = await submitCourseEnrollment({ data: { courseSlug } })
      if ("error" in result) {
        if (result.requiresSubscription) {
          setShowUpgradeDialog(true)
          return
        }
        setError(result.error)
        return
      }

      toast.add({ type: "success", description: "You're enrolled. Happy learning!" })
      await router.invalidate()
    } catch (error) {
      setError(toSubmitErrorMessage(error, "Failed to enroll in this course."))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isEnrolled) {
    return (
      <div className="flex flex-col gap-4">
        <CourseProgress progress={courseProgress} />
        <div className="flex flex-wrap items-center gap-3">
          {nextSection && (
            <Button
              render={
                <Link
                  to={
                    nextSection.sectionType === "ASSIGNMENT"
                      ? "/course/$courseSlug/assignment/$sectionSlug"
                      : "/course/$courseSlug/lesson/$sectionSlug"
                  }
                  params={{ courseSlug, sectionSlug: nextSection.slug }}
                >
                  Continue learning
                  <ArrowRight />
                </Link>
              }
              nativeButton={false}
            />
          )}
          {certificateSlug && (
            <Button
              variant="outline"
              render={
                <Link to="/certificate/$certificateSlug" params={{ certificateSlug }}>
                  <Award />
                  View certificate
                </Link>
              }
              nativeButton={false}
            />
          )}
        </div>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <Button
        render={
          <Link to="/login" search={{ next }}>
            Log in to enroll
          </Link>
        }
        nativeButton={false}
        size="lg"
        className="self-start"
      />
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleEnroll} disabled={isSubmitting} size="lg" className="self-start">
        <Sparkles />
        {isSubmitting ? "Enrolling..." : "Enroll"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <UpgradeRequiredDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        courseSlug={courseSlug}
      />
    </div>
  )
}
