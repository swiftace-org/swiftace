import { createServerFn } from "@tanstack/react-start"

import { readQuestionsByIds, readQuizBySlug } from "@/lib/db.server"
import { runInTransaction } from "@/lib/schema.server"
import { adminMiddleware, toOrderedQuestionIds } from "@/lib/utils"
import type {
  AdminQuizOption,
  AdminQuizQuestion,
  QuestionFields,
  QuizMeta,
  RawQuizOption,
} from "@/types/quiz"

import {
  createQuestion,
  createQuizQuestionLinks,
  deleteQuizQuestionLinks,
  readQuestionIdsByIds,
  updateQuestion,
  updateQuiz,
} from "../-lib/db.server"
import { toAdminQuizDetails, validateQuestions } from "../-lib/utils"
import { QUIZ_SHORT_DESCRIPTION_MAX_LENGTH, QUIZ_VISIBILITY_VALUES } from "../../-lib/constants"
import { readQuizIdBySlugIncludingDeleted } from "../../-lib/db.server"

export const submitUpdateQuiz = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: { quizId: number; meta: QuizMeta; questions: AdminQuizQuestion[] }) => data)
  .handler(async ({ data, context }) => {
    const { quizId, meta, questions } = data

    if (!meta.displayTitle.trim()) {
      return { error: "Quiz title cannot be empty." }
    }
    if (!meta.urlSlug) {
      return { error: "Quiz slug cannot be empty." }
    }
    if (meta.visibility && !QUIZ_VISIBILITY_VALUES.includes(meta.visibility)) {
      return { error: "Invalid visibility." }
    }
    if (meta.shortDescription.length > QUIZ_SHORT_DESCRIPTION_MAX_LENGTH) {
      return {
        error: `Short description should be less than ${QUIZ_SHORT_DESCRIPTION_MAX_LENGTH} characters.`,
      }
    }
    if (Object.keys(validateQuestions(questions)).length) {
      return { error: "Some questions are invalid. Please fix the errors and try again." }
    }

    // `quizzes_url_slug_key` covers soft-deleted rows, so a deleted quiz still holds its
    // slug and has to count as a conflict.
    const slugOwnerId = await readQuizIdBySlugIncludingDeleted(meta.urlSlug)
    if (slugOwnerId !== null && slugOwnerId !== quizId) {
      return { error: `The slug "${meta.urlSlug}" is already taken by another quiz.` }
    }

    // Questions can be deleted from under the editor between load and save; writing then
    // would resurrect them, so bail out and make the admin reload instead.
    const existingIds = questions
      .map((question) => question.id)
      .filter((id): id is number => typeof id === "number")
    const liveIds = await readQuestionIdsByIds(existingIds)
    if (liveIds.length !== new Set(existingIds).size) {
      return { error: "Some questions no longer exist. Please reload the page and try again." }
    }

    let urlSlug: string
    try {
      urlSlug = await saveQuiz(quizId, meta, questions, context.account.id)
    } catch (error) {
      console.error("submitUpdateQuiz: save failed", { quizId, urlSlug: meta.urlSlug, error })
      return { error: "Could not save the quiz. Please try again." }
    }

    // Re-read rather than echo the submitted state back: the save assigns real ids to
    // questions the editor only had temporary ids for.
    const saved = await readQuizBySlug(urlSlug)
    if (!saved) {
      return { error: "Quiz not found after saving." }
    }
    const savedQuestions = await readQuestionsByIds(toOrderedQuestionIds(saved.jsonData))
    return { quiz: toAdminQuizDetails(saved, savedQuestions) }
  })

/**
 * Writes the editor's whole working state in one transaction: new questions (string ids)
 * are inserted, existing ones (numeric ids) updated, the `quiz_questions` links rebuilt,
 * and the ordered ids written back to `quizzes.json_data` so the reads stay consistent.
 */
async function saveQuiz(
  quizId: number,
  meta: QuizMeta,
  questions: AdminQuizQuestion[],
  creatorId: number,
): Promise<string> {
  return runInTransaction(async (tx) => {
    const orderedIds: number[] = []

    for (const question of questions) {
      const fields = toQuestionFields(question)
      if (typeof question.id === "number") {
        await updateQuestion(question.id, fields, tx)
        orderedIds.push(question.id)
      } else {
        orderedIds.push(await createQuestion({ ...fields, creatorId }, tx))
      }
    }

    await deleteQuizQuestionLinks(quizId, tx)
    // The links are deduped even though `json_data` keeps the submitted order verbatim.
    await createQuizQuestionLinks(quizId, [...new Set(orderedIds)], tx)

    const updated = await updateQuiz(
      quizId,
      {
        displayTitle: meta.displayTitle,
        urlSlug: meta.urlSlug,
        shortDescription: meta.shortDescription || null,
        description: meta.description || null,
        visibility: meta.visibility || null,
        jsonData: orderedIds,
      },
      tx,
    )

    return updated.urlSlug
  })
}

function toQuestionFields(question: AdminQuizQuestion): QuestionFields {
  const isText = question.answerMethod === "text"
  return {
    title: question.title,
    explanation: question.explanation || null,
    answerType: question.answerMethod,
    options: isText ? [] : toRawQuizOptions(question.options),
    correctAnswer: isText ? question.correctAnswer : "",
    optional: question.optional,
  }
}

/**
 * Existing rows have sparse option ids (the legacy CSV importer produced 1, 4, 7, …) and
 * grading looks answers up by id, so ids are preserved as-is. They're only renumbered when
 * the incoming ids aren't usable as keys.
 */
function toRawQuizOptions(options: AdminQuizOption[]): RawQuizOption[] {
  const ids = options.map((option) => option.id)
  const usableIds =
    ids.every((id) => typeof id === "number" && Number.isFinite(id)) &&
    new Set(ids).size === ids.length

  return options.map((option, index) => ({
    id: usableIds ? option.id : index + 1,
    value: option.value,
    correct: option.correct,
    explanation: option.explanation || null,
  }))
}
