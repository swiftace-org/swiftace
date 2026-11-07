import { asc, eq, inArray, sql } from "drizzle-orm"

import { db, reviews, type Queryable } from "@/lib/schema.server"
import type { AdminReview, ReviewFields } from "@/types/review"

const adminReviewColumns = {
  id: reviews.id,
  name: reviews.name,
  headline: reviews.headline,
  body: reviews.body,
  avatarUrl: reviews.avatarUrl,
  sourceUrl: reviews.sourceUrl,
  visibility: reviews.visibility,
}

export async function readReviewsForAdmin(): Promise<AdminReview[]> {
  return db.select(adminReviewColumns).from(reviews).orderBy(asc(reviews.position), asc(reviews.id))
}

export async function readReviewIds(): Promise<number[]> {
  const rows = await db.select({ id: reviews.id }).from(reviews)
  return rows.map((row) => row.id)
}

/** Appends after the current last review, in the order given. */
export async function createReviews(
  fields: ReviewFields[],
  tx: Queryable = db,
): Promise<AdminReview[]> {
  return tx
    .insert(reviews)
    .values(
      fields.map((review, index) => ({
        ...review,
        position: sql`(SELECT COALESCE(MAX(position), -1) + ${index + 1} FROM reviews)`,
      })),
    )
    .returning(adminReviewColumns)
}

export async function updateReview(
  reviewId: number,
  fields: ReviewFields,
): Promise<AdminReview | null> {
  const [review] = await db
    .update(reviews)
    .set(fields)
    .where(eq(reviews.id, reviewId))
    .returning(adminReviewColumns)
  return review ?? null
}

/** A visibility toggle must not write back stale review text from another tab. */
export async function updateReviewVisibility(
  reviewId: number,
  visibility: string,
): Promise<boolean> {
  const updated = await db
    .update(reviews)
    .set({ visibility })
    .where(eq(reviews.id, reviewId))
    .returning({ id: reviews.id })
  return updated.length > 0
}

/** Returns false when the review was already gone, so the caller can report it. */
export async function deleteReview(reviewId: number): Promise<boolean> {
  const deleted = await db
    .delete(reviews)
    .where(eq(reviews.id, reviewId))
    .returning({ id: reviews.id })
  return deleted.length > 0
}

/** Rewrites every position in one statement, so a reorder never lands half-applied. */
export async function updateReviewPositions(reviewIds: number[]): Promise<void> {
  if (!reviewIds.length) return
  const positions = sql.join(
    reviewIds.map((id, index) => sql`WHEN ${id} THEN ${index}::integer`),
    sql` `,
  )
  await db
    .update(reviews)
    .set({ position: sql`CASE ${reviews.id} ${positions} END` })
    .where(inArray(reviews.id, reviewIds))
}
