import { createServerFn } from "@tanstack/react-start"

import { adminMiddleware } from "@/lib/utils"

import { deleteReview } from "../-lib/db.server"

export const submitDeleteReview = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: { reviewId: number }) => data)
  .handler(async ({ data }) => {
    try {
      if (!(await deleteReview(data.reviewId))) {
        return { error: "This review no longer exists. Please reload the page." }
      }
      return { deleted: true as const }
    } catch (error) {
      console.error("submitDeleteReview: delete failed", { reviewId: data.reviewId, error })
      return { error: "Could not delete the review. Please try again." }
    }
  })
