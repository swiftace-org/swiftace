/** `quizzes.visibility` values, mirroring `QuizVisibility` in the legacy Flask app. */
export const QUIZ_VISIBILITY_OPTIONS = [
  { value: "PRIVATE", label: "Private" },
  { value: "PUBLIC", label: "Public" },
  { value: "SECRET", label: "Secret" },
]

export const QUIZ_VISIBILITY_LABELS = Object.fromEntries(
  QUIZ_VISIBILITY_OPTIONS.map((option) => [option.value, option.label]),
)

export const QUIZ_VISIBILITY_VALUES = QUIZ_VISIBILITY_OPTIONS.map((option) => option.value)

export const DEFAULT_QUIZ_VISIBILITY = "PRIVATE"

export const QUIZ_SHORT_DESCRIPTION_MAX_LENGTH = 160

/** `quizzes.display_title` is an unbounded `text` column; this is a sanity limit. */
export const QUIZ_TITLE_MAX_LENGTH = 200

/** `quiz_questions` answer methods, mirroring `Question.answer_type` in the legacy app. */
export const QUIZ_ANSWER_METHOD_OPTIONS = [
  { value: "single", label: "Single Choice" },
  { value: "multiple", label: "Multiple Choice" },
  { value: "text", label: "Text Answer" },
]

export const QUIZ_ANSWER_METHOD_LABELS = Object.fromEntries(
  QUIZ_ANSWER_METHOD_OPTIONS.map((option) => [option.value, option.label]),
)
