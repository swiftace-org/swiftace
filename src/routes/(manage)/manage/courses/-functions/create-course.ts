import { createServerFn } from "@tanstack/react-start"

import { COURSE_TITLE_MAX_LENGTH } from "@/lib/config"
import { readCourseBySlugForAdmin } from "@/lib/db.server"
import { adminMiddleware, slugify } from "@/lib/utils"

import { createCourse } from "../-lib/db.server"

export const submitCreateCourseForm = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: { title: string }) => data)
  .handler(async ({ data, context }) => {
    const title = data.title.trim()
    if (!title) {
      return { error: "Title cannot be empty." }
    }
    if (title.length > COURSE_TITLE_MAX_LENGTH) {
      return { error: `Title must be at most ${COURSE_TITLE_MAX_LENGTH} characters.` }
    }

    const slug = slugify(title)
    if (await readCourseBySlugForAdmin(slug)) {
      return { error: `A course with slug "${slug}" already exists.` }
    }

    try {
      const course = await createCourse({ slug, title, ownerId: context.account.id })
      return { course }
    } catch (error) {
      console.error("submitCreateCourseForm: insert failed", { slug, title, error })
      return { error: "Could not create the course. Please try again." }
    }
  })
