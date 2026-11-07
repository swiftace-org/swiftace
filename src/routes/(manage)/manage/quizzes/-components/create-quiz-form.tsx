import { useRouter } from "@tanstack/react-router"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/toast"
import { toSubmitErrorMessage } from "@/lib/utils"

import { submitCreateQuiz } from "../-functions/create-quiz"
import {
  DEFAULT_QUIZ_VISIBILITY,
  QUIZ_VISIBILITY_LABELS,
  QUIZ_VISIBILITY_OPTIONS,
} from "../-lib/constants"

export function CreateQuizForm() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [visibility, setVisibility] = useState(DEFAULT_QUIZ_VISIBILITY)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string>()

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(undefined)

    try {
      const result = await submitCreateQuiz({ data: { title, visibility } })
      if ("error" in result) {
        setError(result.error)
        return
      }
      setTitle("")
      setVisibility(DEFAULT_QUIZ_VISIBILITY)
      toast.add({ type: "success", description: `Quiz ${result.quiz.displayTitle} created!` })
      await router.invalidate()
    } catch (error) {
      setError(toSubmitErrorMessage(error, "Failed to create quiz."))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup className="gap-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <Field className="flex-1">
            <FieldLabel htmlFor="quiz-title">Create a new quiz</FieldLabel>
            <Input
              id="quiz-title"
              value={title}
              placeholder="Enter quiz title"
              onChange={(event) => setTitle(event.target.value)}
            />
          </Field>
          <Field className="sm:w-36">
            <FieldLabel htmlFor="quiz-visibility">Visibility</FieldLabel>
            <Select
              items={QUIZ_VISIBILITY_LABELS}
              value={visibility}
              onValueChange={(value) => setVisibility(value as string)}
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
          <Button type="submit" disabled={isSubmitting || !title.trim()}>
            {isSubmitting ? "Creating..." : "Create"}
          </Button>
        </div>
        <FieldError>{error}</FieldError>
      </FieldGroup>
    </form>
  )
}
