import { createServerFn } from "@tanstack/react-start"

import { readCourseBySlugForAdmin } from "@/lib/db.server"
import { adminMiddleware } from "@/lib/utils"

import { updateCourseSectionSlugs } from "../-lib/db.server"
import { readCourseSectionSlugs } from "../../-lib/db.server"

export const submitReorderCourseSections = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: { courseSlug: string; sectionSlugs: string[] }) => data)
  .handler(async ({ data }) => {
    const course = await readCourseBySlugForAdmin(data.courseSlug)
    if (!course) return { error: "Course not found." }

    // The client sends the whole list back, so reject anything that isn't a permutation of
    // what's stored — a stale tab would otherwise drop sections added since it loaded.
    const currentSlugs = await readCourseSectionSlugs(course.id)
    const isPermutation =
      currentSlugs.length === data.sectionSlugs.length &&
      new Set(data.sectionSlugs).size === data.sectionSlugs.length &&
      data.sectionSlugs.every((slug) => currentSlugs.includes(slug))
    if (!isPermutation) {
      return { error: "The section list changed. Please reload the page and try again." }
    }

    await updateCourseSectionSlugs(course.id, data.sectionSlugs)
    return { reordered: true as const }
  })
