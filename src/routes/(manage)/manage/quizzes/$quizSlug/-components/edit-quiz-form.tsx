import { useRouter } from "@tanstack/react-router"
import { ExternalLink, Plus, Save } from "lucide-react"
import { useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { slugify, toSubmitErrorMessage } from "@/lib/utils"
import type {
  AdminQuizDetails,
  AdminQuizOption,
  AdminQuizQuestion,
  QuizAnswerMethod,
  QuizMeta,
} from "@/types/quiz"

import { submitUpdateQuiz } from "../-functions/update-quiz"
import { validateQuestions } from "../-lib/utils"
import {
  DEFAULT_QUIZ_VISIBILITY,
  QUIZ_SHORT_DESCRIPTION_MAX_LENGTH,
  QUIZ_VISIBILITY_LABELS,
  QUIZ_VISIBILITY_OPTIONS,
  QUIZ_VISIBILITY_VALUES,
} from "../../-lib/constants"
import { ImportCsvMenu } from "./import-csv-menu"
import { QuestionCard } from "./question-card"

export function EditQuizForm({ quiz }: { quiz: AdminQuizDetails }) {
  const router = useRouter()
  const tempIdCounter = useRef(0)
  const [meta, setMeta] = useState<QuizMeta>(() => toQuizMeta(quiz))
  const [questions, setQuestions] = useState<AdminQuizQuestion[]>(quiz.questions)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [dirty, setDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const nextTempId = () => `new-${(tempIdCounter.current += 1)}`

  function updateMeta<Key extends keyof QuizMeta>(key: Key, value: QuizMeta[Key]) {
    setMeta((current) => ({ ...current, [key]: value }))
    setDirty(true)
  }

  function updateQuestions(updater: (current: AdminQuizQuestion[]) => AdminQuizQuestion[]) {
    setQuestions(updater)
    setDirty(true)
  }

  function editQuestion(id: AdminQuizQuestion["id"], patch: Partial<AdminQuizQuestion>) {
    updateQuestions((current) =>
      current.map((question) => (question.id === id ? { ...question, ...patch } : question)),
    )
  }

  function addQuestion() {
    updateQuestions((current) => [
      ...current,
      {
        id: nextTempId(),
        title: "",
        answerMethod: "single",
        optional: false,
        options: [],
        correctAnswer: "",
        explanation: "",
      },
    ])
  }

  function deleteQuestion(id: AdminQuizQuestion["id"], index: number) {
    if (!window.confirm(`Are you sure you want to delete question ${index + 1}?`)) return
    updateQuestions((current) => current.filter((question) => question.id !== id))
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    const target = index + direction
    updateQuestions((current) => {
      if (target < 0 || target >= current.length) return current
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function changeAnswerMethod(id: AdminQuizQuestion["id"], method: QuizAnswerMethod) {
    updateQuestions((current) =>
      current.map((question) => {
        if (question.id !== id) return question
        if (method === "text" || question.answerMethod === "text") {
          return { ...question, answerMethod: method, options: [], correctAnswer: "" }
        }
        return {
          ...question,
          answerMethod: method,
          options: question.options.map((option) => ({ ...option, correct: false })),
        }
      }),
    )
  }

  function addOption(id: AdminQuizQuestion["id"]) {
    updateQuestions((current) =>
      current.map((question) =>
        question.id !== id
          ? question
          : {
              ...question,
              options: [
                ...question.options,
                {
                  // max-based so ids stay unique even after non-last options are
                  // removed (length + 1 could reuse an existing id).
                  id: question.options.reduce((max, option) => Math.max(max, option.id), 0) + 1,
                  value: "",
                  correct: false,
                  explanation: "",
                },
              ],
            },
      ),
    )
  }

  function editOption(
    id: AdminQuizQuestion["id"],
    optionId: number,
    patch: Partial<AdminQuizOption>,
  ) {
    updateQuestions((current) =>
      current.map((question) =>
        question.id !== id
          ? question
          : {
              ...question,
              options: question.options.map((option) =>
                option.id === optionId ? { ...option, ...patch } : option,
              ),
            },
      ),
    )
  }

  function removeOption(id: AdminQuizQuestion["id"], optionId: number) {
    updateQuestions((current) =>
      current.map((question) =>
        question.id !== id
          ? question
          : { ...question, options: question.options.filter((option) => option.id !== optionId) },
      ),
    )
  }

  function moveOption(id: AdminQuizQuestion["id"], optionIndex: number, direction: -1 | 1) {
    updateQuestions((current) =>
      current.map((question) => {
        if (question.id !== id) return question
        const target = optionIndex + direction
        if (target < 0 || target >= question.options.length) return question
        const options = [...question.options]
        ;[options[optionIndex], options[target]] = [options[target], options[optionIndex]]
        return { ...question, options }
      }),
    )
  }

  function toggleOptionCorrect(id: AdminQuizQuestion["id"], optionId: number) {
    updateQuestions((current) =>
      current.map((question) => {
        if (question.id !== id) return question
        return {
          ...question,
          options: question.options.map((option) => {
            if (question.answerMethod === "single") {
              return { ...option, correct: option.id === optionId }
            }
            return option.id === optionId ? { ...option, correct: !option.correct } : option
          }),
        }
      }),
    )
  }

  function importQuestions(imported: AdminQuizQuestion[]) {
    updateQuestions((current) => [...current, ...imported])
  }

  async function handleSave() {
    if (!meta.displayTitle.trim()) {
      toast.add({ type: "error", description: "Quiz title cannot be empty." })
      return
    }
    const urlSlug = slugify(meta.urlSlug)
    if (!urlSlug) {
      toast.add({ type: "error", description: "Url slug cannot be empty." })
      return
    }
    if (meta.shortDescription.trim().length > QUIZ_SHORT_DESCRIPTION_MAX_LENGTH) {
      toast.add({
        type: "error",
        description: `Short description should be less than ${QUIZ_SHORT_DESCRIPTION_MAX_LENGTH} characters.`,
      })
      return
    }

    const validationErrors = validateQuestions(questions)
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors)
      toast.add({ type: "error", description: "Failed to save! Please fix the errors." })
      return
    }
    setErrors({})

    if (!questions.length && !window.confirm("You are creating a blank quiz. Continue?")) {
      return
    }

    setIsSaving(true)
    try {
      const result = await submitUpdateQuiz({
        data: {
          quizId: quiz.id,
          meta: {
            displayTitle: meta.displayTitle.trim(),
            urlSlug,
            shortDescription: meta.shortDescription.trim(),
            description: meta.description.trim(),
            visibility: meta.visibility,
          },
          questions,
        },
      })
      if ("error" in result) {
        toast.add({ type: "error", description: result.error })
        return
      }

      toast.add({ type: "success", description: "Quiz updated." })
      // Reset local state from the server's canonical copy so newly-inserted questions pick
      // up their real numeric ids (a second save would otherwise re-insert them as duplicates).
      const saved = result.quiz
      setMeta(toQuizMeta(saved))
      setQuestions(saved.questions)
      setDirty(false)
      if (saved.urlSlug !== quiz.urlSlug) {
        await router.navigate({
          to: "/manage/quizzes/$quizSlug",
          params: { quizSlug: saved.urlSlug },
        })
      }
      await router.invalidate()
    } catch (error) {
      toast.add({
        type: "error",
        description: toSubmitErrorMessage(error, "Failed to save the quiz."),
      })
    } finally {
      setIsSaving(false)
    }
  }

  const actions = (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        render={
          <a
            href={`/quizzes/${quiz.urlSlug}`}
            target="_blank"
            rel="noreferrer"
            aria-label="View Quiz"
          />
        }
        nativeButton={false}
      >
        <ExternalLink /> View Quiz
      </Button>
      <Button onClick={handleSave} disabled={!dirty || isSaving}>
        <Save /> {isSaving ? "Saving..." : "Save Quiz"}
      </Button>
      <ImportCsvMenu nextTempId={nextTempId} onImport={importQuestions} />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Edit Quiz {quiz.displayTitle}</h1>
        {actions}
      </div>

      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="quiz-title">Quiz Title</FieldLabel>
          <Input
            id="quiz-title"
            value={meta.displayTitle}
            onChange={(event) => updateMeta("displayTitle", event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="quiz-slug">Url Slug</FieldLabel>
          <Input
            id="quiz-slug"
            value={meta.urlSlug}
            onChange={(event) => updateMeta("urlSlug", event.target.value)}
          />
          <FieldDescription>
            Allowed characters: lowercase letters, numbers and hyphens.
          </FieldDescription>
        </Field>
        <Field className="sm:w-48">
          <FieldLabel htmlFor="quiz-visibility">Visibility</FieldLabel>
          <Select
            items={QUIZ_VISIBILITY_LABELS}
            value={meta.visibility}
            onValueChange={(value) => updateMeta("visibility", value as string)}
          >
            <SelectTrigger id="quiz-visibility" className="h-9! w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUIZ_VISIBILITY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="quiz-short-description">Short Description</FieldLabel>
          <Textarea
            id="quiz-short-description"
            value={meta.shortDescription}
            onChange={(event) => updateMeta("shortDescription", event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="quiz-description">Quiz Description</FieldLabel>
          <Textarea
            id="quiz-description"
            className="min-h-32"
            placeholder="Markdown supported"
            value={meta.description}
            onChange={(event) => updateMeta("description", event.target.value)}
          />
        </Field>
      </FieldGroup>

      <div className="space-y-4">
        {questions.map((question, index) => (
          <QuestionCard
            key={question.id}
            question={question}
            index={index}
            total={questions.length}
            errors={errors[String(question.id)] ?? []}
            onEdit={editQuestion}
            onDelete={() => deleteQuestion(question.id, index)}
            onMove={(direction) => moveQuestion(index, direction)}
            onChangeAnswerMethod={changeAnswerMethod}
            onAddOption={addOption}
            onEditOption={editOption}
            onRemoveOption={removeOption}
            onMoveOption={moveOption}
            onToggleOptionCorrect={toggleOptionCorrect}
            onSave={handleSave}
          />
        ))}
      </div>

      <Button variant="outline" onClick={addQuestion}>
        <Plus /> Add Question
      </Button>

      <div className="border-t pt-4">{actions}</div>
    </div>
  )
}

function toQuizMeta(quiz: AdminQuizDetails): QuizMeta {
  const visibility = quiz.visibility ?? DEFAULT_QUIZ_VISIBILITY
  return {
    displayTitle: quiz.displayTitle,
    urlSlug: quiz.urlSlug,
    shortDescription: quiz.shortDescription ?? "",
    description: quiz.description ?? "",
    // Guard against a stored value the select can't represent.
    visibility: QUIZ_VISIBILITY_VALUES.includes(visibility) ? visibility : DEFAULT_QUIZ_VISIBILITY,
  }
}

/** Mirrors the legacy validation in `EditQuiz.handleSave`. */
