import { and, eq, inArray } from "drizzle-orm"

import { type Queryable, db, questions, quizQuestions, quizzes } from "@/lib/schema.server"
import type { QuestionFields } from "@/types/quiz"

export async function readQuestionIdsByIds(ids: number[]): Promise<number[]> {
  if (!ids.length) return []

  const rows = await db
    .select({ id: questions.id })
    .from(questions)
    .where(and(inArray(questions.id, ids), eq(questions.deleted, false)))

  return rows.map((row) => row.id)
}

export async function createQuestion(
  values: QuestionFields & { creatorId: number },
  tx: Queryable = db,
): Promise<number> {
  const [question] = await tx.insert(questions).values(values).returning({ id: questions.id })

  return question.id
}

/** `quiz_questions` is keyed on (quiz_id, question_id), so `questionIds` must be deduped. */
export async function createQuizQuestionLinks(
  quizId: number,
  questionIds: number[],
  tx: Queryable = db,
): Promise<void> {
  if (!questionIds.length) return

  await tx.insert(quizQuestions).values(questionIds.map((questionId) => ({ quizId, questionId })))
}

export async function updateQuestion(
  questionId: number,
  fields: QuestionFields,
  tx: Queryable = db,
): Promise<void> {
  await tx.update(questions).set(fields).where(eq(questions.id, questionId))
}

export async function updateQuiz(
  quizId: number,
  fields: {
    displayTitle: string
    urlSlug: string
    shortDescription: string | null
    description: string | null
    visibility: string | null
    /** The ordered question ids; see `readQuizBySlug`. */
    jsonData: number[]
  },
  tx: Queryable = db,
): Promise<{ urlSlug: string }> {
  // `question_count` is deliberately left alone: it caps how many questions an attempt
  // serves (e.g. 25 of 50) and is not a cached count of the quiz's questions.
  const [quiz] = await tx
    .update(quizzes)
    .set(fields)
    .where(eq(quizzes.id, quizId))
    .returning({ urlSlug: quizzes.urlSlug })

  return quiz
}

/** Clears a quiz's question links so the caller can rewrite them from the submitted order. */
export async function deleteQuizQuestionLinks(quizId: number, tx: Queryable = db): Promise<void> {
  await tx.delete(quizQuestions).where(eq(quizQuestions.quizId, quizId))
}
