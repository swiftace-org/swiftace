import { createServerFn } from "@tanstack/react-start"

import { readQuestionsByIds, readQuizBySlug } from "@/lib/db.server"
import { authMiddleware, toOrderedQuestionIds } from "@/lib/utils"
import { captureEvent, readCourseForViewer } from "@/lib/utils.server"
import type {
  QuizAnswerSubmission,
  QuizGradeFeedback,
  QuizGradeResult,
  QuizQuestionRow,
  RawQuizOption,
} from "@/types/quiz"

import { QUIZ_REATTEMPT_COOLDOWN_MS } from "../-lib/constants"
import {
  createQuizQuestionAttempt,
  readCorrectlyAnsweredQuestionIds,
  readLatestQuestionAttemptAt,
} from "../-lib/db.server"
import { countQuestionsLeft, isQuizReadable, toQuizUrlSlug } from "../-lib/utils"
import { createOrUpdateSectionCompletion, readCourseSectionsBySlugs } from "../../../-lib/db.server"
import { canOpenSection } from "../../../-lib/utils"
import { renderMarkdown } from "../../../-lib/utils.server"

const NOT_FOUND = { error: "This question could not be found." }

/**
 * Grades one answer, records the attempt, and returns the feedback the question card renders.
 *
 * A question is reachable only the way a learner reaches it: a course they may see, a section
 * they may open, a readable quiz, and that quiz's own question list — the last check is what
 * stops `questionId` being a free-form index into `questions`. Answering is for enrollees, and
 * a question can only be re-answered a minute after the last try, both as in the legacy app: the
 * per-option feedback that makes a self-check quiz useful is also a way to brute-force it.
 */
export const gradeQuizAnswer = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: QuizAnswerSubmission) => data)
  .handler(async ({ data, context }): Promise<QuizGradeResult | { error: string }> => {
    const { account } = context

    const viewer = await readCourseForViewer(data.courseSlug)
    if (!viewer) return NOT_FOUND

    const [section] = await readCourseSectionsBySlugs(viewer.course.id, [data.sectionSlug])
    if (!section?.quizUrl) return NOT_FOUND
    if (!canOpenSection(section, viewer)) return NOT_FOUND
    if (!viewer.isEnrolled && !viewer.isAdmin) {
      return { error: "Enroll in this course to answer its questions." }
    }

    const quiz = await readQuizBySlug(toQuizUrlSlug(section.quizUrl))
    if (!quiz) return NOT_FOUND
    if (!isQuizReadable(quiz.visibility, viewer.isAdmin)) return NOT_FOUND
    // Without this the section is just a doorway: any question id could be graded through it.
    const orderedIds = toOrderedQuestionIds(quiz.jsonData)
    if (!orderedIds.includes(data.questionId)) return NOT_FOUND

    const lastAttemptAt = await readLatestQuestionAttemptAt(quiz.id, account.id, data.questionId)
    const waitMs = lastAttemptAt
      ? QUIZ_REATTEMPT_COOLDOWN_MS - (Date.now() - lastAttemptAt.getTime())
      : 0
    if (waitMs > 0) {
      return {
        error: `You answered this question recently. Try again in ${Math.ceil(waitMs / 1000)}s.`,
      }
    }

    const questions = await readQuestionsByIds(orderedIds)
    const question = questions.find((row) => row.id === data.questionId)
    if (!question) return NOT_FOUND

    const feedback = await toFeedback(question, data)

    try {
      await createQuizQuestionAttempt({
        quizId: quiz.id,
        accountId: account.id,
        questionId: question.id,
        isCorrect: feedback.isCorrect,
      })
    } catch (error) {
      console.error("gradeQuizAnswer: failed to record the attempt", error)
      return { error: "Couldn't record your answer. Please try again." }
    }

    // Read back rather than adding this answer to a cached set: an attempt from another tab
    // would otherwise leave the lesson one question short of completing forever.
    const solvedQuestionIds = await readCorrectlyAnsweredQuestionIds(quiz.id, account.id)
    const questionsLeft = countQuestionsLeft(questions, solvedQuestionIds)

    const completedSection = viewer.isEnrolled && !!section.requireQuestions && questionsLeft === 0
    if (completedSection) {
      try {
        await createOrUpdateSectionCompletion({
          sectionId: section.id,
          enrolleeId: account.id,
          completedAt: new Date(),
        })
        captureEvent(account.id, "lesson_completed", {
          courseSlug: viewer.course.slug,
          sectionSlug: section.slug,
          viaQuiz: true,
        })
      } catch (error) {
        // The answer itself is saved, so the lesson completes on the next one rather than
        // reporting a failure over correct feedback the learner is already looking at.
        console.error("gradeQuizAnswer: failed to complete the lesson", error)
      }
    }

    return { feedback, questionsLeft, completedSection }
  })

async function toFeedback(
  question: QuizQuestionRow,
  data: QuizAnswerSubmission,
): Promise<QuizGradeFeedback> {
  if (question.answerType === "text") {
    const isCorrect =
      (data.answer ?? "").trim().toLowerCase() ===
      (question.correctAnswer ?? "").trim().toLowerCase()
    const explanationHtml = question.explanation
      ? (await renderMarkdown(question.explanation, { embeds: true })).markup
      : null
    return { kind: "text", isCorrect, explanationHtml }
  }

  const rawOptions = Array.isArray(question.options) ? (question.options as RawQuizOption[]) : []
  const optionById = new Map(rawOptions.map((option) => [String(option.id), option]))
  const selectedIds = data.options ?? []
  const correctIds = rawOptions
    .filter((option) => option.correct)
    .map((option) => String(option.id))

  const isCorrect =
    correctIds.length === selectedIds.length && correctIds.every((id) => selectedIds.includes(id))
  const allSelectedCorrect = selectedIds.every((id) => optionById.get(id)?.correct)

  const explanationEntries = await Promise.all(
    selectedIds.map(async (id) => {
      const option = optionById.get(id)
      if (!option) return null
      const explanationHtml = option.explanation
        ? (await renderMarkdown(option.explanation, { embeds: true })).markup
        : null
      return [id, { correct: !!option.correct, explanationHtml }] as const
    }),
  )

  return {
    kind: "choice",
    isCorrect,
    allSelectedCorrect,
    options: Object.fromEntries(explanationEntries.filter((entry) => entry !== null)),
  }
}
