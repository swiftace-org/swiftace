import { createServerFn } from "@tanstack/react-start"

import { adminMiddleware } from "@/lib/utils"
import type { ReviewFields, ReviewFormValues } from "@/types/review"

import { REVIEW_IMPORT_MAX_ROWS } from "../-lib/constants"
import { createReviews } from "../-lib/db.server"
import { toReviewFields } from "../-lib/utils"

export const submitImportReviews = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: { rows: ReviewFormValues[] }) => data)
  .handler(async ({ data }) => {
    if (!data.rows.length) return { error: "There are no reviews to import." }
    if (data.rows.length > REVIEW_IMPORT_MAX_ROWS) {
      return { error: `Import at most ${REVIEW_IMPORT_MAX_ROWS} reviews at a time.` }
    }

    const fields: ReviewFields[] = []
    for (const [index, row] of data.rows.entries()) {
      const result = toReviewFields(row)
      if ("error" in result) return { error: `Review ${index + 1}: ${result.error}` }
      fields.push(result.fields)
    }

    try {
      const reviews = await createReviews(fields)
      return { imported: reviews.length }
    } catch (error) {
      console.error("submitImportReviews: insert failed", { count: fields.length, error })
      return { error: "Could not import the reviews. Please try again." }
    }
  })
