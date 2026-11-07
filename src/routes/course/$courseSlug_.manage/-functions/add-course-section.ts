import { createServerFn } from "@tanstack/react-start"

import { COURSE_SECTION_TITLE_MAX_LENGTH } from "@/lib/config"
import { readCourseBySlugForAdmin } from "@/lib/db.server"
import { runInTransaction } from "@/lib/schema.server"
import { adminMiddleware, slugify } from "@/lib/utils"
import type { AdminCourseSectionSummary, CourseSectionType } from "@/types/course"

import {
  createCourseSection,
  readCourseSectionBySlug,
  restoreCourseSection,
  updateCourseSectionSlugs,
} from "../-lib/db.server"
import { DEFAULT_COURSE_SECTION_VISIBILITY } from "../../-lib/constants"
import { readCourseSectionSlugs } from "../../-lib/db.server"

export const submitAddCourseSectionForm = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: { courseSlug: string; title: string; sectionType: CourseSectionType }) => data)
  .handler(async ({ data }) => {
    const course = await readCourseBySlugForAdmin(data.courseSlug)
    if (!course) return { error: "Course not found." }

    const title = data.title.trim()
    if (!title) {
      return { error: "Title cannot be empty." }
    }
    if (title.length > COURSE_SECTION_TITLE_MAX_LENGTH) {
      return { error: `Title must be at most ${COURSE_SECTION_TITLE_MAX_LENGTH} characters.` }
    }

    const slug = slugify(title)
    if (!slug) {
      return { error: "Title must contain at least one letter or number." }
    }

    const [existing, currentSlugs] = await Promise.all([
      readCourseSectionBySlug(course.id, slug),
      readCourseSectionSlugs(course.id),
    ])
    if (existing && !existing.deleted) {
      return { error: `A section with slug "${slug}" already exists.` }
    }

    const fields = {
      title,
      sectionType: data.sectionType,
      visibility: DEFAULT_COURSE_SECTION_VISIBILITY,
    }

    let section: AdminCourseSectionSummary
    try {
      section = await runInTransaction(async (tx) => {
        // A soft-deleted row still occupies the (course_id, slug) unique index, so recreating
        // a section that was deleted earlier has to revive that row instead of inserting.
        const written = existing
          ? await restoreCourseSection(existing.id, fields, tx)
          : await createCourseSection({ courseId: course.id, slug, ...fields }, tx)
        await updateCourseSectionSlugs(course.id, [...currentSlugs, slug], tx)
        return written
      })
    } catch (error) {
      console.error("submitAddCourseSectionForm: write failed", {
        courseId: course.id,
        slug,
        error,
      })
      return { error: "Could not add the section. Please try again." }
    }

    return { section }
  })
