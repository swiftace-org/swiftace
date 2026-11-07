import { toOrderedQuestionIds } from "@/lib/utils"
import type {
  AdminQuizDetails,
  AdminQuizQuestion,
  QuizAnswerMethod,
  QuizQuestionRow,
  RawQuizOption,
} from "@/types/quiz"

/** Mirrors the legacy validation in `EditQuiz.handleSave`. */
export function validateQuestions(questions: AdminQuizQuestion[]): Record<string, string[]> {
  const errors: Record<string, string[]> = {}
  for (const question of questions) {
    const messages: string[] = []
    if (!question.title.length) {
      messages.push("Empty question text")
    }
    if (question.answerMethod === "text") {
      if (!question.correctAnswer.length) {
        messages.push("No correct answer added")
      }
    } else {
      const seen = new Set<string>()
      let hasDuplicate = false
      let hasEmpty = false
      let hasCorrect = false
      for (const option of question.options) {
        if (!option.value.length) {
          hasEmpty = true
        } else if (seen.has(option.value)) {
          hasDuplicate = true
        } else {
          seen.add(option.value)
        }
        hasCorrect = hasCorrect || option.correct
      }
      if (hasDuplicate) messages.push("Options should be different")
      if (hasEmpty || !question.options.length) messages.push("No options added")
      if (!hasCorrect) messages.push("No correct answer added")
    }
    if (messages.length) {
      errors[String(question.id)] = messages
    }
  }
  return errors
}

/**
 * Reshapes a quiz row and its questions into the editor's working shape. Stored option ids are
 * kept rather than renumbered — they are sparse, and grading looks answers up by id.
 */
export function toAdminQuizDetails(
  quiz: {
    id: number
    urlSlug: string
    displayTitle: string | null
    shortDescription: string | null
    description: string | null
    visibility: string | null
    jsonData: unknown
  },
  questions: QuizQuestionRow[],
): AdminQuizDetails {
  const byId = new Map(questions.map((question) => [question.id, question]))
  return {
    id: quiz.id,
    urlSlug: quiz.urlSlug,
    displayTitle: quiz.displayTitle ?? "",
    shortDescription: quiz.shortDescription,
    description: quiz.description,
    visibility: quiz.visibility,
    questions: toOrderedQuestionIds(quiz.jsonData)
      .map((id) => byId.get(id))
      .filter((question): question is QuizQuestionRow => Boolean(question))
      .map(toAdminQuizQuestion),
  }
}

function toAdminQuizQuestion(row: QuizQuestionRow): AdminQuizQuestion {
  const rawOptions = Array.isArray(row.options) ? (row.options as RawQuizOption[]) : []
  return {
    id: row.id,
    title: row.title ?? "",
    explanation: row.explanation ?? "",
    answerMethod: toQuizAnswerMethod(row.answerType),
    correctAnswer: row.correctAnswer ?? "",
    optional: !!row.optional,
    options: rawOptions.map((option, index) => ({
      id: typeof option.id === "number" ? option.id : index + 1,
      value: option.value ?? "",
      correct: !!option.correct,
      explanation: option.explanation ?? "",
    })),
  }
}

/** Some legacy rows have an empty `answer_type`; treat anything unknown as single choice. */
export function toQuizAnswerMethod(answerType: string | null): QuizAnswerMethod {
  return answerType === "text" || answerType === "multiple" ? answerType : "single"
}
