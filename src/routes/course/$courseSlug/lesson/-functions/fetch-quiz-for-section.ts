import { createServerFn } from "@tanstack/react-start"

import { readQuestionsByIds, readQuizBySlug } from "@/lib/db.server"
import { toOrderedQuestionIds } from "@/lib/utils"
import { readCourseForViewer } from "@/lib/utils.server"
import type { PublicQuizQuestion, QuizData, QuizQuestionRow, RawQuizOption } from "@/types/quiz"

import { readCorrectlyAnsweredQuestionIds } from "../-lib/db.server"
import { countQuestionsLeft, isQuizReadable, toQuizUrlSlug } from "../-lib/utils"
import { readCourseSectionsBySlugs } from "../../../-lib/db.server"
import { canOpenSection } from "../../../-lib/utils"
import { renderMarkdown } from "../../../-lib/utils.server"

/**
 * The questions for a lesson's quiz, with the answers stripped by `toPublicQuestion`. Gated like
 * the notebook — visible course, open section, past the paywall — and `gradeQuizAnswer` repeats
 * all of it, since answering is a separate request that can't rely on this one having happened.
 */
export const fetchQuizForSection = createServerFn({ method: "GET" })
  .validator((data: { courseSlug: string; sectionSlug: string }) => data)
  .handler(async ({ data }): Promise<QuizData | null> => {
    const viewer = await readCourseForViewer(data.courseSlug)
    if (!viewer) return null

    const [section] = await readCourseSectionsBySlugs(viewer.course.id, [data.sectionSlug])
    if (!section) return null
    if (!canOpenSection(section, viewer)) return null
    if (!section.quizUrl) return null

    const urlSlug = toQuizUrlSlug(section.quizUrl)
    if (!urlSlug) return null

    const quiz = await readQuizBySlug(urlSlug)
    if (!quiz) return null
    if (!isQuizReadable(quiz.visibility, viewer.isAdmin)) return null

    const orderedIds = toOrderedQuestionIds(quiz.jsonData)
    const rows = await readQuestionsByIds(orderedIds)
    const byId = new Map(rows.map((row) => [row.id, row]))
    const ordered = orderedIds
      .map((id) => byId.get(id))
      .filter((row): row is QuizQuestionRow => Boolean(row))

    // Attempts are only recorded for a signed-in learner, so there is nothing to look up
    // for anyone else — see `gradeQuizAnswer`, which is where they're written.
    const solvedQuestionIds = viewer.account
      ? await readCorrectlyAnsweredQuestionIds(quiz.id, viewer.account.id)
      : []

    return {
      displayTitle: quiz.displayTitle,
      questions: await Promise.all(ordered.map(toPublicQuestion)),
      solvedQuestionIds,
      questionsLeft: countQuestionsLeft(ordered, solvedQuestionIds),
      requireQuestions: !!section.requireQuestions,
      canAnswer: viewer.isEnrolled || viewer.isAdmin,
    }
  })

/** Strips the correct answers before the question ever reaches the browser. */
async function toPublicQuestion(question: QuizQuestionRow): Promise<PublicQuizQuestion> {
  const titleHtml = question.title
    ? (await renderMarkdown(question.title, { embeds: true })).markup
    : ""
  const rawOptions = Array.isArray(question.options) ? (question.options as RawQuizOption[]) : []
  const options = rawOptions.length
    ? await Promise.all(
        rawOptions.map(async (option) => ({
          id: String(option.id),
          valueHtml: (await renderMarkdown(option.value, { embeds: true })).markup,
        })),
      )
    : null

  return {
    id: question.id,
    titleHtml,
    answerMethod: (question.answerType ?? "text") as PublicQuizQuestion["answerMethod"],
    optional: !!question.optional,
    options,
  }
}
