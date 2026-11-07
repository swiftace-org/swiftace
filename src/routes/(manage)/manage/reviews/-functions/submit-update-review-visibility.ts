import { createServerFn } from "@tanstack/react-start"

import { adminMiddleware } from "@/lib/utils"

import { REVIEW_VISIBILITY_VALUES } from "../-lib/constants"
import { updateReviewVisibility } from "../-lib/db.server"

export const submitUpdateReviewVisibility = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: { reviewId: number; visibility: string }) => data)
  .handler(async ({ data }) => {
    if (!REVIEW_VISIBILITY_VALUES.includes(data.visibility)) {
      return { error: `Visibility must be one of ${REVIEW_VISIBILITY_VALUES.join(", ")}.` }
    }

    try {
      if (!(await updateReviewVisibility(data.reviewId, data.visibility))) {
        return { error: "This review no longer exists. Please reload the page." }
      }
      return { updated: true as const }
    } catch (error) {
      console.error("submitUpdateReviewVisibility: update failed", {
        reviewId: data.reviewId,
        error,
      })
      return { error: "Could not update the review's visibility. Please try again." }
    }
  })
