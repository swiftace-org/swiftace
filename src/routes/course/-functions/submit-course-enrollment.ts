import { createServerFn } from "@tanstack/react-start"

import { ENROLLMENT_GRANTED_BY_SUBSCRIPTION } from "@/lib/config"
import { createOrRestoreCourseEnrollment } from "@/lib/db.server"
import { authMiddleware } from "@/lib/utils"
import { captureEvent, readCourseForViewer, readHasActiveSubscription } from "@/lib/utils.server"

/**
 * Enrolls the signed-in account, which is what unlocks completing lessons, submitting
 * assignments and earning a certificate. The paywall lives here rather than on the content, and
 * free courses skip it. Returns `requiresSubscription` so the button can link to pricing.
 */
export const submitCourseEnrollment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { courseSlug: string }) => data)
  .handler(
    async ({
      data,
      context,
    }): Promise<{ enrolled: true } | { error: string; requiresSubscription?: boolean }> => {
      const { account } = context

      // Goes through the viewer check so a private course can't be enrolled into by anyone
      // who guesses its slug — the same rule the course page itself applies.
      const viewer = await readCourseForViewer(data.courseSlug)
      if (!viewer) return { error: "Course not found." }

      const { course } = viewer
      if (course.isPaid && !(await readHasActiveSubscription(account.id))) {
        captureEvent(account.id, "course_enrollment_paywalled", { courseSlug: course.slug })
        return {
          error: "A subscription is required to enroll in this course.",
          requiresSubscription: true,
        }
      }

      try {
        await createOrRestoreCourseEnrollment({
          courseId: course.id,
          enrolleeId: account.id,
          // Only a paid course's enrollment is owed to the subscription, so only it is
          // marked — and only marked rows are revoked when the subscription lapses. A free
          // course was never gated, so it must stay unmarked and therefore permanent.
          paymentStatus: course.isPaid ? ENROLLMENT_GRANTED_BY_SUBSCRIPTION : null,
        })
      } catch (error) {
        console.error(`Failed to enroll account ${account.id} in ${data.courseSlug}.`, error)
        return { error: "Could not enroll you in this course. Please try again." }
      }

      captureEvent(account.id, "course_enrolled", {
        courseSlug: course.slug,
        isPaid: course.isPaid,
      })
      return { enrolled: true }
    },
  )
