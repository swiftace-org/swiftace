import { createServerFn } from "@tanstack/react-start"

import { adminMiddleware } from "@/lib/utils"

import { readCourseIdsForAdmin, updateCoursePositions } from "../-lib/db.server"

export const submitReorderCourses = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: { courseIds: number[] }) => data)
  .handler(async ({ data }) => {
    // Only a full permutation is accepted, so a stale tab can't strand courses added since.
    const currentIds = new Set(await readCourseIdsForAdmin())
    const isPermutation =
      currentIds.size === data.courseIds.length &&
      new Set(data.courseIds).size === data.courseIds.length &&
      data.courseIds.every((id) => currentIds.has(id))
    if (!isPermutation) {
      return { error: "The course list changed. Please reload the page and try again." }
    }

    try {
      await updateCoursePositions(data.courseIds)
      return { reordered: true as const }
    } catch (error) {
      console.error("submitReorderCourses: update failed", { error })
      return { error: "Could not save the new order. Please try again." }
    }
  })
