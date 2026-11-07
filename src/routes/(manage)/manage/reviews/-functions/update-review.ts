import { createServerFn } from "@tanstack/react-start"

import { adminMiddleware } from "@/lib/utils"
import type { ReviewFormValues } from "@/types/review"

import { updateReview } from "../-lib/db.server"
import { toReviewFields } from "../-lib/utils"

export const submitUpdateReview = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: { reviewId: number; values: ReviewFormValues }) => data)
  .handler(async ({ data }) => {
    const result = toReviewFields(data.values)
    if ("error" in result) return result

    try {
      const review = await updateReview(data.reviewId, result.fields)
      if (!review) return { error: "This review no longer exists. Please reload the page." }
      return { review }
    } catch (error) {
      console.error("submitUpdateReview: update failed", { reviewId: data.reviewId, error })
      return { error: "Could not save the review. Please try again." }
    }
  })
