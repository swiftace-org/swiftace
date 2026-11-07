import { and, desc, eq } from "drizzle-orm"

import { type Queryable, db, quizQuestionAttempts } from "@/lib/schema.server"

/** When this account last answered this question, for the re-attempt cooldown. */
export async function readLatestQuestionAttemptAt(
  quizId: number,
  accountId: number,
  questionId: number,
): Promise<Date | null> {
  const [attempt] = await db
    .select({ createdAt: quizQuestionAttempts.createdAt })
    .from(quizQuestionAttempts)
    .where(
      and(
        eq(quizQuestionAttempts.quizId, quizId),
        eq(quizQuestionAttempts.accountId, accountId),
        eq(quizQuestionAttempts.questionId, questionId),
      ),
    )
    .orderBy(desc(quizQuestionAttempts.createdAt))
    .limit(1)

  return attempt?.createdAt ?? null
}

/** The questions of a quiz this account has ever got right — what "solved" means here. */
export async function readCorrectlyAnsweredQuestionIds(
  quizId: number,
  accountId: number,
): Promise<number[]> {
  const rows = await db
    .selectDistinct({ questionId: quizQuestionAttempts.questionId })
    .from(quizQuestionAttempts)
    .where(
      and(
        eq(quizQuestionAttempts.quizId, quizId),
        eq(quizQuestionAttempts.accountId, accountId),
        eq(quizQuestionAttempts.isCorrect, true),
      ),
    )

  return rows.map((row) => row.questionId)
}

/** Every attempt is its own row; the cooldown and the solved set are both derived from them. */
export async function createQuizQuestionAttempt(
  values: { quizId: number; accountId: number; questionId: number; isCorrect: boolean },
  tx: Queryable = db,
): Promise<void> {
  await tx.insert(quizQuestionAttempts).values(values)
}
