import { createServerFn } from "@tanstack/react-start"

import { COURSE_TITLE_MAX_LENGTH, COURSE_VISIBILITY_VALUES } from "@/lib/config"
import { readCourseBySlugForAdmin } from "@/lib/db.server"
import { adminMiddleware, slugify } from "@/lib/utils"
import type { CourseDetailsFormValues } from "@/types/course"

import { readCourseIdBySlugExcluding, updateCourseDetails } from "../-lib/db.server"
import { toCourseCover } from "../-lib/utils.server"

export const submitCourseDetailsForm = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: { courseSlug: string; values: CourseDetailsFormValues }) => data)
  .handler(async ({ data }) => {
    const course = await readCourseBySlugForAdmin(data.courseSlug)
    if (!course) return { error: "Course not found." }

    const title = data.values.title.trim()
    const slug = slugify(data.values.slug)
    const shortDescription = data.values.shortDescription.trim()

    if (!title) {
      return { error: "Title cannot be empty." }
    }
    if (title.length > COURSE_TITLE_MAX_LENGTH) {
      return { error: `Title must be at most ${COURSE_TITLE_MAX_LENGTH} characters.` }
    }
    if (!slug) {
      return { error: "Course slug cannot be empty." }
    }
    if (!shortDescription) {
      return { error: "Short description cannot be empty." }
    }
    if (data.values.visibility && !COURSE_VISIBILITY_VALUES.includes(data.values.visibility)) {
      return { error: "Invalid visibility." }
    }
    const cover = toCourseCover(data.values.cover, course.cover)
    if ("error" in cover) return cover
    if (await readCourseIdBySlugExcluding(slug, course.id)) {
      return { error: `A course with slug "${slug}" already exists.` }
    }

    try {
      const updated = await updateCourseDetails(course.id, {
        title,
        slug,
        shortDescription,
        description: data.values.description?.trim() || null,
        cover: cover.cover,
        visibility: data.values.visibility || null,
        videoUrl: data.values.videoUrl?.trim() || null,
        certificateTemplate: data.values.certificateTemplate?.trim() || null,
        isPaid: data.values.isPaid,
        stripeProductId: data.values.stripeProductId?.trim() || null,
        additionalInformation: data.values.additionalInformation?.trim() || null,
      })
      return { course: updated }
    } catch (error) {
      console.error("submitCourseDetailsForm: update failed", { courseId: course.id, slug, error })
      return { error: "Could not save the course. Please try again." }
    }
  })
