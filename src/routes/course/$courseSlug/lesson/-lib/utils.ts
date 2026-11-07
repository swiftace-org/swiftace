/** Quiz links look like `https://<host>/quizzes/<slug>` — the slug is segment 4. */
export function toQuizUrlSlug(quizUrl: string): string {
  const parts = quizUrl.split("/")
  return parts.length < 5 ? "" : parts[4]
}

/**
 * Whether a quiz may be served to this caller, mirroring the legacy `fetch_quiz`: a PRIVATE quiz
 * — and a NULL one, which meant the same — is admin-only, while PUBLIC and SECRET are readable.
 * Nothing checked this before, so a section linking a private quiz handed it to anyone.
 */
export function isQuizReadable(visibility: string | null, isAdmin: boolean): boolean {
  if (isAdmin) return true
  return visibility === "PUBLIC" || visibility === "SECRET"
}

/**
 * How many of a quiz's questions still stand between a learner and completing the lesson,
 * mirroring `count_quiz_unsolved_questions`: optional questions never count.
 */
export function countQuestionsLeft(
  questions: { id: number; optional: boolean | null }[],
  solvedQuestionIds: number[],
): number {
  const solved = new Set(solvedQuestionIds)
  return questions.filter((question) => !question.optional && !solved.has(question.id)).length
}
