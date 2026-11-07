import { createServerFn } from "@tanstack/react-start"

import { readCourseBySlugForAdmin } from "@/lib/db.server"
import { adminMiddleware } from "@/lib/utils"
import type { AdminCourseDetails, AdminCourseSectionSummary } from "@/types/course"

import { readCourseSectionsBySlugsForAdmin, readCourseSectionSlugs } from "../-lib/db.server"

export const loadManageCourseData = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .validator((data: { courseSlug: string }) => data)
  .handler(
    async ({
      data,
    }): Promise<{ course: AdminCourseDetails | null; sections: AdminCourseSectionSummary[] }> => {
      const course = await readCourseBySlugForAdmin(data.courseSlug)
      if (!course) return { course: null, sections: [] }

      const slugs = await readCourseSectionSlugs(course.id)
      const sections = await readCourseSectionsBySlugsForAdmin(course.id, slugs)
      return { course, sections }
    },
  )
