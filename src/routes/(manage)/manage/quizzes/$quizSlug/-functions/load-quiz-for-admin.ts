import { createServerFn } from "@tanstack/react-start"

import { readQuestionsByIds, readQuizBySlug } from "@/lib/db.server"
import { adminMiddleware, toOrderedQuestionIds } from "@/lib/utils"
import type { AdminQuizDetails } from "@/types/quiz"

import { toAdminQuizDetails } from "../-lib/utils"

export const loadQuizForAdmin = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .validator((data: { quizSlug: string }) => data)
  .handler(async ({ data }): Promise<AdminQuizDetails | null> => {
    const quiz = await readQuizBySlug(data.quizSlug)
    if (!quiz) return null

    const questions = await readQuestionsByIds(toOrderedQuestionIds(quiz.jsonData))
    return toAdminQuizDetails(quiz, questions)
  })
