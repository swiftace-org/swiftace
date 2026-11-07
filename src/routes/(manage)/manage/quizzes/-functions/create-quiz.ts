import { createServerFn } from "@tanstack/react-start"

import { adminMiddleware, slugify } from "@/lib/utils"

import { QUIZ_TITLE_MAX_LENGTH, QUIZ_VISIBILITY_VALUES } from "../-lib/constants"
import { createQuiz, readQuizIdBySlugIncludingDeleted } from "../-lib/db.server"

/** Bounds the slug search so a pathological title can't spin here indefinitely. */
const MAX_SLUG_ATTEMPTS = 50

export const submitCreateQuiz = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: { title: string; visibility: string }) => data)
  .handler(async ({ data }) => {
    const title = data.title.trim()
    if (!title) {
      return { error: "Title cannot be empty." }
    }
    if (title.length > QUIZ_TITLE_MAX_LENGTH) {
      return { error: `Title must be at most ${QUIZ_TITLE_MAX_LENGTH} characters.` }
    }
    if (!QUIZ_VISIBILITY_VALUES.includes(data.visibility)) {
      return { error: "Invalid visibility." }
    }

    const urlSlug = await findAvailableQuizSlug(slugify(title) || "quiz")
    if (!urlSlug) {
      return { error: "Could not find an available slug for that title. Please rename the quiz." }
    }

    try {
      const quiz = await createQuiz({ urlSlug, displayTitle: title, visibility: data.visibility })
      return { quiz }
    } catch (error) {
      console.error("submitCreateQuiz: insert failed", { urlSlug, title, error })
      return { error: "Could not create the quiz. Please try again." }
    }
  })

/**
 * `quizzes_url_slug_key` is unique across soft-deleted rows too, so a deleted quiz still
 * occupies its slug and the suffix has to skip past it.
 */
async function findAvailableQuizSlug(base: string): Promise<string | null> {
  for (let suffix = 0; suffix < MAX_SLUG_ATTEMPTS; suffix++) {
    const candidate = suffix === 0 ? base : `${base}-${suffix}`
    if (!(await readQuizIdBySlugIncludingDeleted(candidate))) return candidate
  }
  return null
}
