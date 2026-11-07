import type { SubmissionRequirement } from "@/types/assignment"

import { SUBMISSION_VALIDATION_URL } from "../../../-lib/constants"
import { isValidUrl } from "../../../-lib/utils"

/**
 * Checks answers against the assignment's requirements, returning a message per offending field
 * id. Pure, so the form runs it before submitting and the server runs it again before writing —
 * the server's copy is the one that counts. Unlike the legacy check, blank counts as missing.
 */
export function validateSubmissionAnswers(
  requirements: SubmissionRequirement[],
  answers: Record<string, string>,
): Record<string, string> {
  const errors: Record<string, string> = {}

  for (const requirement of requirements) {
    const value = (answers[requirement.id] ?? "").trim()
    const label = requirement.title || requirement.id

    if (!value) {
      if (requirement.required) errors[requirement.id] = `“${label}” is required`
      continue
    }

    if (requirement.validation === SUBMISSION_VALIDATION_URL && !isValidUrl(value)) {
      errors[requirement.id] = `“${value}” is not a valid URL`
    }
  }

  return errors
}
