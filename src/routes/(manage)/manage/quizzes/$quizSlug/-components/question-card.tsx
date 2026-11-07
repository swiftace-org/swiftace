import { ChevronDown, ChevronUp, Plus, Save, Trash2 } from "lucide-react"
import { useState } from "react"

import { IconButton } from "@/components/icon-button"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { AdminQuizOption, AdminQuizQuestion, QuizAnswerMethod } from "@/types/quiz"

import { QUIZ_ANSWER_METHOD_LABELS, QUIZ_ANSWER_METHOD_OPTIONS } from "../../-lib/constants"
import { CollapsibleExplanation } from "./collapsible-explanation"
import { OptionRow } from "./option-row"

export function QuestionCard({
  question,
  index,
  total,
  errors,
  onEdit,
  onDelete,
  onMove,
  onChangeAnswerMethod,
  onAddOption,
  onEditOption,
  onRemoveOption,
  onMoveOption,
  onToggleOptionCorrect,
  onSave,
}: {
  question: AdminQuizQuestion
  index: number
  total: number
  errors: string[]
  onEdit: (id: AdminQuizQuestion["id"], patch: Partial<AdminQuizQuestion>) => void
  onDelete: () => void
  onMove: (direction: -1 | 1) => void
  onChangeAnswerMethod: (id: AdminQuizQuestion["id"], method: QuizAnswerMethod) => void
  onAddOption: (id: AdminQuizQuestion["id"]) => void
  onEditOption: (
    id: AdminQuizQuestion["id"],
    optionId: number,
    patch: Partial<AdminQuizOption>,
  ) => void
  onRemoveOption: (id: AdminQuizQuestion["id"], optionId: number) => void
  onMoveOption: (id: AdminQuizQuestion["id"], optionIndex: number, direction: -1 | 1) => void
  onToggleOptionCorrect: (id: AdminQuizQuestion["id"], optionId: number) => void
  onSave: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-md border">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? (
            <ChevronUp className="size-4 shrink-0" />
          ) : (
            <ChevronDown className="size-4 shrink-0" />
          )}
          <span className="truncate font-medium" title={question.title}>
            Question {index + 1}
            {question.title ? ` - ${question.title}` : ""}
          </span>
        </button>
        <div className="flex items-center">
          <IconButton tooltip="Save Question" onClick={onSave}>
            <Save />
          </IconButton>
          <IconButton
            tooltip="Delete Question"
            className="hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 />
          </IconButton>
          <IconButton tooltip="Move Down" disabled={index >= total - 1} onClick={() => onMove(1)}>
            <ChevronDown />
          </IconButton>
          <IconButton tooltip="Move Up" disabled={index <= 0} onClick={() => onMove(-1)}>
            <ChevronUp />
          </IconButton>
        </div>
      </div>

      {open ? (
        <FieldGroup className="gap-4 border-t px-3 py-4">
          <Field>
            <FieldLabel htmlFor={`question-title-${question.id}`}>Question Text</FieldLabel>
            <Textarea
              id={`question-title-${question.id}`}
              placeholder="Markdown supported"
              value={question.title}
              onChange={(event) => onEdit(question.id, { title: event.target.value })}
            />
          </Field>

          <Field orientation="horizontal">
            <Checkbox
              id={`question-optional-${question.id}`}
              checked={question.optional}
              onCheckedChange={(checked) => onEdit(question.id, { optional: checked === true })}
            />
            <FieldLabel htmlFor={`question-optional-${question.id}`} className="font-normal">
              Is this question optional?
            </FieldLabel>
          </Field>

          <Field className="sm:w-56">
            <FieldLabel htmlFor={`question-method-${question.id}`}>Answer Method</FieldLabel>
            <Select
              items={QUIZ_ANSWER_METHOD_LABELS}
              value={question.answerMethod}
              onValueChange={(value) =>
                onChangeAnswerMethod(question.id, value as QuizAnswerMethod)
              }
            >
              <SelectTrigger id={`question-method-${question.id}`} className="h-9! w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUIZ_ANSWER_METHOD_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {question.answerMethod === "text" ? (
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor={`question-answer-${question.id}`}>Correct Answer</FieldLabel>
                <Input
                  id={`question-answer-${question.id}`}
                  value={question.correctAnswer}
                  onChange={(event) => onEdit(question.id, { correctAnswer: event.target.value })}
                />
              </Field>
              <CollapsibleExplanation
                value={question.explanation}
                onChange={(value) => onEdit(question.id, { explanation: value })}
              />
            </FieldGroup>
          ) : (
            <div className="space-y-3">
              {question.options.map((option, optionIndex) => (
                <OptionRow
                  key={option.id}
                  option={option}
                  optionIndex={optionIndex}
                  optionCount={question.options.length}
                  isRadio={question.answerMethod === "single"}
                  onToggleCorrect={() => onToggleOptionCorrect(question.id, option.id)}
                  onChangeValue={(value) => onEditOption(question.id, option.id, { value })}
                  onChangeExplanation={(value) =>
                    onEditOption(question.id, option.id, { explanation: value })
                  }
                  onRemove={() => onRemoveOption(question.id, option.id)}
                  onMove={(direction) => onMoveOption(question.id, optionIndex, direction)}
                />
              ))}
              <Button variant="secondary" size="sm" onClick={() => onAddOption(question.id)}>
                <Plus /> Add Option
              </Button>
            </div>
          )}

          <FieldError>{errors.length ? errors.join(", ") : null}</FieldError>
        </FieldGroup>
      ) : errors.length ? (
        <FieldError className="border-t px-3 py-2">{errors.join(", ")}</FieldError>
      ) : null}
    </div>
  )
}
