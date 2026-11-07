/** `PENDING` and `DRAFT` cover submissions with no stored status; see `ASSIGNMENT_STATUS_OPTIONS`. */
export type AssignmentStatus = "PASS" | "FAIL" | "PENDING" | "DRAFT" | "PROCESSING"

/** One field of a submission, resolved against the assignment's `submission_requirements`. */
export type SubmissionField = {
  id: string
  title: string
  value: string
  /** Pre-rendered markup for the fields declared as markdown; plain text fields get null. */
  html: string | null
}

/**
 * A `submission_requirements` entry — one field of an assignment's submission form.
 *
 * The evaluation page only reads `id`, `title` and `type`; the rest is what the form itself
 * needs. Every live row carries all six keys, but they come out of untyped JSON, so
 * `toSubmissionRequirements` fills in a default rather than trusting them.
 */
export type SubmissionRequirement = {
  id: string
  title: string
  /** `input`, `textarea` or `markdown` — which control the form renders. */
  type: string
  required: boolean
  placeholder: string
  /** See `SUBMISSION_VALIDATION_*`; anything else means "any text will do". */
  validation: string
}

/** One of an enrollee's own submissions, as their submission history lists it. */
export type LearnerSubmission = {
  id: number
  submittedAt: Date
  status: AssignmentStatus
  fields: SubmissionField[]
  /** The evaluator's feedback, pre-rendered — it is written as markdown. */
  commentsHtml: string | null
}

/** Everything the assignment's Submit tab renders, for whoever is looking at it. */
export type AssignmentSubmissionPage = {
  /** Null when the slugs don't name an assignment this caller may open; the tab 404s. */
  assignment: {
    title: string
    /** Whether the form offers "Save as draft" — `course_sections.allow_draft`. */
    allowDraft: boolean
    /** `evaluation_guide_internal`, pre-rendered; shown under the form as in the legacy app. */
    evaluationGuideHtml: string | null
  } | null
  requirements: SubmissionRequirement[]
  /** Empty for anyone signed out or not enrolled — they have no submissions to show. */
  submissions: LearnerSubmission[]
  isEnrolled: boolean
}
