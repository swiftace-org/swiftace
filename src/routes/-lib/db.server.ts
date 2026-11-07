import { asc, eq } from "drizzle-orm"

import { db, reviews } from "@/lib/schema.server"
import type { Review } from "@/types/review"

export async function readVisibleReviews(): Promise<Review[]> {
  return db
    .select({
      id: reviews.id,
      name: reviews.name,
      headline: reviews.headline,
      body: reviews.body,
      avatarUrl: reviews.avatarUrl,
      sourceUrl: reviews.sourceUrl,
    })
    .from(reviews)
    .where(eq(reviews.visibility, "PUBLIC"))
    .orderBy(asc(reviews.position), asc(reviews.id))
}
