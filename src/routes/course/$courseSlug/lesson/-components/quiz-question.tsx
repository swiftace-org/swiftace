import { useState } from "react"

import { Markdown } from "@/components/markdown"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn, toSubmitErrorMessage } from "@/lib/utils"
import type { PublicQuizQuestion, QuizGradeFeedback, QuizGradeResult } from "@/types/quiz"

import { gradeQuizAnswer } from "../-functions/grade-quiz-answer"

type Status = "idle" | "checking" | "correct" | "partial" | "wrong"

export function QuizQuestion({
  question,
  index,
  courseSlug,
  sectionSlug,
  canAnswer,
  isSolved,
  onGraded,
}: {
  question: PublicQuizQuestion
  index: number
  /** Grading resolves the question through the lesson, so it needs both slugs. */
  courseSlug: string
  sectionSlug: string
  /** False for anyone not enrolled — the server refuses their answers either way. */
  canAnswer: boolean
  /** Already answered correctly in an earlier visit, per the recorded attempts. */
  isSolved: boolean
  onGraded: (result: QuizGradeResult) => void
}) {
  const [status, setStatus] = useState<Status>("idle")
  const [textAnswer, setTextAnswer] = useState("")
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])
  const [feedback, setFeedback] = useState<QuizGradeFeedback | null>(null)
  const [error, setError] = useState<string>()

  const isDone = status === "correct" || status === "partial" || status === "wrong"
  const disabled = status === "checking" || isDone
  const hasAnswer =
    question.answerMethod === "text" ? textAnswer.trim().length > 0 : selectedOptions.length > 0

  async function handleCheck() {
    setStatus("checking")
    setError(undefined)

    try {
      const result = await gradeQuizAnswer({
        data: {
          courseSlug,
          sectionSlug,
          questionId: question.id,
          answer: question.answerMethod === "text" ? textAnswer : undefined,
          options: question.answerMethod !== "text" ? selectedOptions : undefined,
        },
      })

      if ("error" in result) {
        setError(result.error)
        setStatus("idle")
        return
      }

      setFeedback(result.feedback)
      setStatus(toStatus(result.feedback, question.answerMethod))
      onGraded(result)
    } catch (error) {
      setError(toSubmitErrorMessage(error, "Couldn't check your answer."))
      setStatus("idle")
    }
  }

  function handleRetry() {
    setStatus("idle")
    setFeedback(null)
    setError(undefined)
    setTextAnswer("")
    setSelectedOptions([])
  }

  function handleMultipleChange(optionId: string, checked: boolean) {
    setSelectedOptions((current) =>
      checked ? [...current, optionId] : current.filter((existing) => existing !== optionId),
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <QuestionHeader index={index} optional={question.optional} isSolved={isSolved} />

      <Markdown markup={question.titleHtml} />

      {question.answerMethod === "text" && (
        <TextAnswerInput value={textAnswer} onChange={setTextAnswer} disabled={disabled} />
      )}

      {question.answerMethod === "single" && (
        <SingleChoiceOptions
          options={question.options}
          selectedOptionId={selectedOptions[0] ?? ""}
          onChange={(optionId) => setSelectedOptions([optionId])}
          disabled={disabled}
          feedback={feedback}
        />
      )}

      {question.answerMethod === "multiple" && (
        <MultipleChoiceOptions
          options={question.options}
          selectedOptionIds={selectedOptions}
          onChange={handleMultipleChange}
          disabled={disabled}
          feedback={feedback}
        />
      )}

      <TextExplanation feedback={feedback} status={status} />

      <QuizActions
        status={status}
        isDone={isDone}
        hasAnswer={hasAnswer}
        canAnswer={canAnswer}
        onCheck={handleCheck}
        onRetry={handleRetry}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

/** A partial pass only exists for multiple-choice: some right, none wrong, not all of them. */
function toStatus(feedback: QuizGradeFeedback, answerMethod: PublicQuizQuestion["answerMethod"]) {
  if (feedback.isCorrect) return "correct"
  if (feedback.kind === "choice" && answerMethod === "multiple" && feedback.allSelectedCorrect) {
    return "partial"
  }
  return "wrong"
}

function QuestionHeader({
  index,
  optional,
  isSolved,
}: {
  index: number
  optional?: boolean
  isSolved: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground">Question {index + 1}</span>
      {optional && <Badge variant="secondary">Optional</Badge>}
      {isSolved && <Badge variant="secondary">Solved</Badge>}
    </div>
  )
}

function TextAnswerInput({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  disabled: boolean
}) {
  return (
    <Input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      placeholder="Type your answer"
    />
  )
}

function SingleChoiceOptions({
  options,
  selectedOptionId,
  onChange,
  disabled,
  feedback,
}: {
  options: PublicQuizQuestion["options"]
  selectedOptionId: string
  onChange: (optionId: string) => void
  disabled: boolean
  feedback: QuizGradeFeedback | null
}) {
  if (!options) return null

  return (
    <RadioGroup value={selectedOptionId} onValueChange={onChange} disabled={disabled}>
      {options.map((option) => (
        <div key={option.id} className="flex flex-col gap-1">
          <div className="flex items-start gap-2">
            <RadioGroupItem value={option.id} className="mt-1" />
            <Markdown markup={option.valueHtml} />
          </div>
          <OptionFeedback feedback={feedback} optionId={option.id} />
        </div>
      ))}
    </RadioGroup>
  )
}

function MultipleChoiceOptions({
  options,
  selectedOptionIds,
  onChange,
  disabled,
  feedback,
}: {
  options: PublicQuizQuestion["options"]
  selectedOptionIds: string[]
  onChange: (optionId: string, checked: boolean) => void
  disabled: boolean
  feedback: QuizGradeFeedback | null
}) {
  if (!options) return null

  return (
    <div className="flex flex-col gap-3">
      {options.map((option) => (
        <div key={option.id} className="flex flex-col gap-1">
          <div className="flex items-start gap-2">
            <Checkbox
              checked={selectedOptionIds.includes(option.id)}
              onCheckedChange={(checked) => onChange(option.id, checked === true)}
              disabled={disabled}
              className="mt-1"
            />
            <Markdown markup={option.valueHtml} />
          </div>
          <OptionFeedback feedback={feedback} optionId={option.id} />
        </div>
      ))}
    </div>
  )
}

function OptionFeedback({
  feedback,
  optionId,
}: {
  feedback: QuizGradeFeedback | null
  optionId: string
}) {
  if (feedback?.kind !== "choice") return null
  const option = feedback.options[optionId]
  if (!option) return null

  return (
    <div
      className={cn(
        "ml-6 rounded-md border p-2 text-sm",
        option.correct
          ? "border-primary/40 bg-primary/10"
          : "border-destructive/40 bg-destructive/10",
      )}
    >
      {option.explanationHtml ? (
        <Markdown markup={option.explanationHtml} />
      ) : (
        <span>{option.correct ? "Correct" : "Incorrect"}</span>
      )}
    </div>
  )
}

function TextExplanation({
  feedback,
  status,
}: {
  feedback: QuizGradeFeedback | null
  status: Status
}) {
  if (feedback?.kind !== "text" || !feedback.explanationHtml) return null

  return (
    <div
      className={cn(
        "rounded-md border p-3 text-sm",
        status === "correct"
          ? "border-primary/40 bg-primary/10"
          : "border-destructive/40 bg-destructive/10",
      )}
    >
      <Markdown markup={feedback.explanationHtml} />
    </div>
  )
}

function QuizActions({
  status,
  isDone,
  hasAnswer,
  canAnswer,
  onCheck,
  onRetry,
}: {
  status: Status
  isDone: boolean
  hasAnswer: boolean
  canAnswer: boolean
  onCheck: () => void
  onRetry: () => void
}) {
  return (
    <div className="flex items-center gap-3">
      {isDone ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      ) : (
        <Button
          size="sm"
          disabled={!canAnswer || !hasAnswer || status === "checking"}
          onClick={onCheck}
        >
          {status === "checking" ? "Checking…" : "Check"}
        </Button>
      )}
      {status === "correct" && <span className="text-sm font-medium text-primary">Correct</span>}
      {status === "partial" && (
        <span className="text-sm font-medium text-destructive">
          Not all correct options selected
        </span>
      )}
      {status === "wrong" && (
        <span className="text-sm font-medium text-destructive">Incorrect</span>
      )}
    </div>
  )
}
