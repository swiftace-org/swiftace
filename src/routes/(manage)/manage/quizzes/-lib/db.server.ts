import { and, eq } from "drizzle-orm"

import { db, quizzes } from "@/lib/schema.server"
import type { AdminQuizSummary } from "@/types/quiz"

/**
 * Slug-uniqueness probe for the quiz editor. `quizzes_url_slug_key` is unique across
 * soft-deleted rows too, so deleted quizzes have to count as conflicts — otherwise the
 * insert fails with a raw DB error instead of a message the admin can act on.
 */
export async function readQuizIdBySlugIncludingDeleted(urlSlug: string): Promise<number | null> {
  const [quiz] = await db
    .select({ id: quizzes.id })
    .from(quizzes)
    .where(eq(quizzes.urlSlug, urlSlug))
    .limit(1)

  return quiz?.id ?? null
}

export async function readQuizzesForAdmin(): Promise<AdminQuizSummary[]> {
  return db
    .select({
      id: quizzes.id,
      urlSlug: quizzes.urlSlug,
      displayTitle: quizzes.displayTitle,
      visibility: quizzes.visibility,
    })
    .from(quizzes)
    .where(eq(quizzes.deleted, false))
    .orderBy(quizzes.id)
}

// ---------------------------------------------------------------------------

export async function createQuiz(values: {
  urlSlug: string
  displayTitle: string
  visibility: string | null
}): Promise<AdminQuizSummary> {
  const [quiz] = await db
    .insert(quizzes)
    .values({ ...values, jsonData: [] })
    .returning({
      id: quizzes.id,
      urlSlug: quizzes.urlSlug,
      displayTitle: quizzes.displayTitle,
      visibility: quizzes.visibility,
    })

  return quiz
}

/** Returns false when no matching live quiz existed, so the caller can report it. */
export async function softDeleteQuizBySlug(urlSlug: string): Promise<boolean> {
  const deleted = await db
    .update(quizzes)
    .set({ deleted: true })
    .where(and(eq(quizzes.urlSlug, urlSlug), eq(quizzes.deleted, false)))
    .returning({ id: quizzes.id })

  return deleted.length > 0
}
