import { createServerFn } from "@tanstack/react-start"

import { readCourseBySlugForAdmin } from "@/lib/db.server"
import { runInTransaction } from "@/lib/schema.server"
import { adminMiddleware } from "@/lib/utils"

import {
  readCourseSectionBySlug,
  softDeleteCourseSection,
  updateCourseSectionSlugs,
} from "../-lib/db.server"
import { readCourseSectionSlugs } from "../../-lib/db.server"

export const submitDeleteCourseSection = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: { courseSlug: string; sectionSlug: string }) => data)
  .handler(async ({ data }) => {
    const course = await readCourseBySlugForAdmin(data.courseSlug)
    if (!course) return { error: "Course not found." }

    const section = await readCourseSectionBySlug(course.id, data.sectionSlug)
    if (!section || section.deleted) {
      return { error: "Section not found." }
    }

    try {
      await runInTransaction(async (tx) => {
        await softDeleteCourseSection(section.id, data.sectionSlug, tx)
        const currentSlugs = await readCourseSectionSlugs(course.id, tx)
        await updateCourseSectionSlugs(
          course.id,
          currentSlugs.filter((slug) => slug !== data.sectionSlug),
          tx,
        )
      })
    } catch (error) {
      console.error("submitDeleteCourseSection: write failed", {
        courseId: course.id,
        sectionSlug: data.sectionSlug,
        error,
      })
      return { error: "Could not delete the section. Please try again." }
    }

    return { deleted: true as const }
  })
