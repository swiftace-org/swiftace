import { createServerFn } from "@tanstack/react-start"

import { adminMiddleware } from "@/lib/utils"

import { softDeleteQuizBySlug } from "../-lib/db.server"

export const submitDeleteQuiz = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: { urlSlug: string }) => data)
  .handler(async ({ data }) => {
    if (!(await softDeleteQuizBySlug(data.urlSlug))) {
      return { error: "Quiz not found." }
    }
    return { success: true as const }
  })
