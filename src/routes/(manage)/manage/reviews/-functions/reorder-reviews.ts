import { createServerFn } from "@tanstack/react-start"

import { adminMiddleware } from "@/lib/utils"

import { readReviewIds, updateReviewPositions } from "../-lib/db.server"

export const submitReorderReviews = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: { reviewIds: number[] }) => data)
  .handler(async ({ data }) => {
    // Only a full permutation is accepted, so a stale tab can't strand reviews added since.
    const currentIds = new Set(await readReviewIds())
    const isPermutation =
      currentIds.size === data.reviewIds.length &&
      new Set(data.reviewIds).size === data.reviewIds.length &&
      data.reviewIds.every((id) => currentIds.has(id))
    if (!isPermutation) {
      return { error: "The review list changed. Please reload the page and try again." }
    }

    try {
      await updateReviewPositions(data.reviewIds)
      return { reordered: true as const }
    } catch (error) {
      console.error("submitReorderReviews: update failed", { error })
      return { error: "Could not save the new order. Please try again." }
    }
  })
