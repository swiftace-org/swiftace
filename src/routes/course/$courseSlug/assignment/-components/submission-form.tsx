import { Link, useLocation, useRouter } from "@tanstack/react-router"
import { useState } from "react"

import { Markdown } from "@/components/markdown"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { toSubmitErrorMessage } from "@/lib/utils"
import type { SubmissionRequirement } from "@/types/assignment"

import { submitAssignmentSubmission } from "../-functions/submit-assignment-submission"
import { validateSubmissionAnswers } from "../-lib/utils"
import { SUBMISSION_MARKDOWN_FIELD_TYPES } from "../../../-lib/constants"

/**
 * The assignment's submission form, built from its `submission_requirements`. Answers are
 * validated here before the round trip and again on the server; both sets of errors land in the
 * same per-field map, so a failure reads the same whichever side caught it.
 */
export function SubmissionForm({
  courseSlug,
  sectionSlug,
  requirements,
  allowDraft,
  evaluationGuideHtml,
  isEnrolled,
  isSignedIn,
}: {
  courseSlug: string
  sectionSlug: string
  requirements: SubmissionRequirement[]
  allowDraft: boolean
  evaluationGuideHtml: string | null
  isEnrolled: boolean
  isSignedIn: boolean
}) {
  const next = useLocation({ select: (location) => location.href })
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState<"submit" | "draft">()

  async function handleSubmit(isDraft: boolean) {
    setError(undefined)

    const errors = validateSubmissionAnswers(requirements, answers)
    if (Object.keys(errors).length) {
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    setPending(isDraft ? "draft" : "submit")

    try {
      const result = await submitAssignmentSubmission({
        data: { courseSlug, sectionSlug, answers, isDraft },
      })

      if ("error" in result) {
        setFieldErrors(result.fieldErrors ?? {})
        setError(result.error)
        return
      }

      toast.add({
        type: "success",
        description: result.isDraft
          ? "Draft saved."
          : "Submission received. We'll let you know your result.",
      })
      setAnswers({})
      await router.invalidate()
    } catch (error) {
      setError(toSubmitErrorMessage(error, "Failed to make this submission."))
    } finally {
      setPending(undefined)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {!isSignedIn && (
        <SubmissionNotice message="Log in and enroll in this course to make a submission.">
          <Button
            render={
              <Link to="/login" search={{ next }}>
                Log in
              </Link>
            }
            nativeButton={false}
            size="sm"
          />
        </SubmissionNotice>
      )}

      {isSignedIn && !isEnrolled && (
        <SubmissionNotice message="Enroll in this course to make a submission.">
          <Button
            render={
              <Link to="/course/$courseSlug" params={{ courseSlug }}>
                Go to course
              </Link>
            }
            nativeButton={false}
            size="sm"
          />
        </SubmissionNotice>
      )}

      <FieldGroup className="gap-5">
        {requirements.map((requirement) => (
          <SubmissionField
            key={requirement.id}
            requirement={requirement}
            value={answers[requirement.id] ?? ""}
            error={fieldErrors[requirement.id]}
            disabled={!isEnrolled || !!pending}
            onChange={(value) => setAnswers((current) => ({ ...current, [requirement.id]: value }))}
          />
        ))}
      </FieldGroup>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={!isEnrolled || !!pending} onClick={() => void handleSubmit(false)}>
            {pending === "submit" ? "Submitting..." : "Submit"}
          </Button>
          {allowDraft && (
            <Button
              variant="outline"
              disabled={!isEnrolled || !!pending}
              onClick={() => void handleSubmit(true)}
            >
              {pending === "draft" ? "Saving..." : "Save as draft"}
            </Button>
          )}
        </div>
        <FieldError>{error}</FieldError>
        <p className="text-sm text-muted-foreground">
          You can submit multiple times. Only your last submission will be evaluated.
        </p>
      </div>

      {evaluationGuideHtml && (
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Evaluation Criteria</h2>
          <Markdown markup={evaluationGuideHtml} className="prose-sm" />
        </div>
      )}
    </div>
  )
}

function SubmissionField({
  requirement,
  value,
  error,
  disabled,
  onChange,
}: {
  requirement: SubmissionRequirement
  value: string
  error: string | undefined
  disabled: boolean
  onChange: (value: string) => void
}) {
  const isLongText = SUBMISSION_MARKDOWN_FIELD_TYPES.includes(requirement.type)
  const label = requirement.title || requirement.id

  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={requirement.id}>
        {label}
        {requirement.required && <span className="text-muted-foreground">(Required)</span>}
      </FieldLabel>
      {isLongText ? (
        <Textarea
          id={requirement.id}
          value={value}
          placeholder={requirement.placeholder}
          disabled={disabled}
          aria-invalid={!!error}
          rows={6}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <Input
          id={requirement.id}
          value={value}
          placeholder={requirement.placeholder}
          disabled={disabled}
          aria-invalid={!!error}
          // Deliberately not `type="url"`: the browser's own validation would fire before
          // ours and word the failure differently for every field on the form.
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      <FieldError>{error}</FieldError>
    </Field>
  )
}

function SubmissionNotice({ message, children }: { message: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed px-4 py-3">
      <p className="text-sm text-muted-foreground">{message}</p>
      {children}
    </div>
  )
}
