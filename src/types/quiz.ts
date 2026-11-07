export type QuizAnswerMethod = "single" | "multiple" | "text"

export type RawQuizOption = {
  id: number
  value: string
  correct: boolean
  explanation: string | null
}

export type PublicQuizOption = {
  id: string
  valueHtml: string
}

export type PublicQuizQuestion = {
  id: number
  titleHtml: string
  answerMethod: QuizAnswerMethod
  optional: boolean
  options: PublicQuizOption[] | null
}

export type QuizData = {
  displayTitle: string | null
  questions: PublicQuizQuestion[]
  /** Questions this learner has already got right, so the tab can open with them settled. */
  solvedQuestionIds: number[]
  /** Non-optional questions still unsolved — what `require_questions` completion counts down. */
  questionsLeft: number
  /** Whether finishing the quiz is what completes the lesson, rather than a button. */
  requireQuestions: boolean
  /** Answering is enrollment-only, so the tab has to say why the Check button is missing. */
  canAnswer: boolean
}

export type QuizAnswerSubmission = {
  /**
   * The lesson the question is being answered from. Required so grading can check the caller
   * may see this course and section, rather than trusting `questionId` on its own.
   */
  courseSlug: string
  sectionSlug: string
  questionId: number
  answer?: string
  options?: string[]
}

export type QuizGradeFeedback =
  | {
      kind: "text"
      isCorrect: boolean
      explanationHtml: string | null
    }
  | {
      kind: "choice"
      isCorrect: boolean
      allSelectedCorrect: boolean
      options: Record<string, { correct: boolean; explanationHtml: string | null }>
    }

export type QuizGradeResult = {
  feedback: QuizGradeFeedback
  /** Non-optional questions in this quiz this learner still hasn't got right. */
  questionsLeft: number
  /** Set when this answer is what finished a `require_questions` lesson. */
  completedSection: boolean
}

/** A `questions` row as read for display or grading. */
export type QuizQuestionRow = {
  id: number
  title: string | null
  explanation: string | null
  answerType: string | null
  options: unknown
  correctAnswer: string | null
  optional: boolean
}

/** The writable subset of `questions`, shared by the create and update paths. */
export type QuestionFields = {
  title: string
  explanation: string | null
  answerType: QuizAnswerMethod
  options: RawQuizOption[]
  correctAnswer: string
  optional: boolean
}

export type AdminQuizSummary = {
  id: number
  urlSlug: string
  displayTitle: string | null
  visibility: string | null
}

export type AdminQuizOption = {
  id: number
  value: string
  correct: boolean
  explanation: string
}

/**
 * A quiz question in the admin editor's working shape. `id` is a `number` for
 * questions that already exist in the `questions` table and a `string` (a
 * client-generated temporary id) for ones added in the editor but not yet saved.
 */
export type AdminQuizQuestion = {
  id: number | string
  title: string
  answerMethod: QuizAnswerMethod
  optional: boolean
  options: AdminQuizOption[]
  correctAnswer: string
  explanation: string
}

/** What the quiz editor holds for the quiz itself, as distinct from its questions. */
export type QuizMeta = {
  displayTitle: string
  urlSlug: string
  shortDescription: string
  description: string
  visibility: string
}

export type AdminQuizDetails = {
  id: number
  urlSlug: string
  displayTitle: string
  shortDescription: string | null
  description: string | null
  visibility: string | null
  questions: AdminQuizQuestion[]
}
