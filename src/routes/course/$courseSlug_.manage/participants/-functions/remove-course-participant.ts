import { createServerFn } from "@tanstack/react-start"

import { readCourseBySlugForAdmin } from "@/lib/db.server"
import { adminMiddleware } from "@/lib/utils"

import { readCourseCertificateSlugForOwner, softDeleteCourseEnrollment } from "../-lib/db.server"

export const submitRemoveCourseParticipant = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: { courseSlug: string; accountId: number }) => data)
  .handler(async ({ data }): Promise<{ success: true } | { error: string }> => {
    const course = await readCourseBySlugForAdmin(data.courseSlug)
    if (!course) {
      return { error: "Course not found." }
    }

    // A certificate outlives the enrollment it was issued against, so removing the
    // participant would leave a certificate nobody can explain. Revoke it first.
    const certificateSlug = await readCourseCertificateSlugForOwner(course.id, data.accountId)
    if (certificateSlug) {
      return { error: "This participant holds a certificate for the course and can't be removed." }
    }

    try {
      const removed = await softDeleteCourseEnrollment(course.id, data.accountId)
      if (!removed) {
        return { error: "This participant is no longer enrolled in the course." }
      }
    } catch (error) {
      console.error("Failed to remove course participant.", error)
      return { error: "Could not remove this participant. Please try again." }
    }

    return { success: true }
  })
