/**
 * How long a learner has to wait before re-answering a question they've already attempted,
 * mirroring the legacy `attempt_question` guard. It exists to stop a wrong answer being turned
 * into a right one by cycling the options, since grading returns per-option feedback.
 */
export const QUIZ_REATTEMPT_COOLDOWN_MS = 60_000
