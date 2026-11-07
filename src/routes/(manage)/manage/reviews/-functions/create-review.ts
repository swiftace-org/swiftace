import { createServerFn } from "@tanstack/react-start"

import { adminMiddleware } from "@/lib/utils"
import type { ReviewFormValues } from "@/types/review"

import { createReviews } from "../-lib/db.server"
import { toReviewFields } from "../-lib/utils"

export const submitCreateReview = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: { values: ReviewFormValues }) => data)
  .handler(async ({ data }) => {
    const result = toReviewFields(data.values)
    if ("error" in result) return result

    try {
      const [review] = await createReviews([result.fields])
      return { review }
    } catch (error) {
      console.error("submitCreateReview: insert failed", { name: result.fields.name, error })
      return { error: "Could not add the review. Please try again." }
    }
  })
