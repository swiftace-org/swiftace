import { createServerFn } from "@tanstack/react-start"

import { readCourseForViewer } from "@/lib/utils.server"
import type {
  AssignmentStatus,
  AssignmentSubmissionPage,
  LearnerSubmission,
  SubmissionRequirement,
} from "@/types/assignment"

import { readAssignmentSectionBySlug, readEnrolleeAssignmentSubmissions } from "../-lib/db.server"
import { ASSIGNMENT_STATUS_VALUES } from "../../../-lib/constants"
import { canOpenSection, toSubmissionRequirements } from "../../../-lib/utils"
import { renderMarkdown, toRenderedSubmissionFields } from "../../../-lib/utils.server"

const NO_ASSIGNMENT: AssignmentSubmissionPage = {
  assignment: null,
  requirements: [],
  submissions: [],
  isEnrolled: false,
}

/**
 * The Submit tab's data: the assignment's form, and the caller's own attempts at it. Gated like
 * the notebook behind the Notes tab, because `submission_requirements` and the evaluation guide
 * are content rather than public metadata. History is only loaded for someone actually enrolled.
 */
export const loadAssignmentSubmission = createServerFn({ method: "GET" })
  .validator((data: { courseSlug: string; sectionSlug: string }) => data)
  .handler(async ({ data }): Promise<AssignmentSubmissionPage> => {
    const viewer = await readCourseForViewer(data.courseSlug)
    if (!viewer) return NO_ASSIGNMENT

    const section = await readAssignmentSectionBySlug(viewer.course.id, data.sectionSlug)
    if (!section) return NO_ASSIGNMENT
    if (!canOpenSection(section, viewer)) return NO_ASSIGNMENT

    const { account, isEnrolled } = viewer
    const requirements = toSubmissionRequirements(section.submissionRequirements)
    const rows =
      account && isEnrolled ? await readEnrolleeAssignmentSubmissions(section.id, account.id) : []

    return {
      assignment: {
        title: section.title,
        // A section that doesn't allow drafts must not offer the button, because the form
        // sends `isDraft` and the mutation trusts this same column rather than the client.
        allowDraft: !!section.allowDraft,
        evaluationGuideHtml: section.evaluationGuideInternal
          ? (await renderMarkdown(section.evaluationGuideInternal)).markup
          : null,
      },
      requirements,
      submissions: await Promise.all(rows.map((row) => toLearnerSubmission(row, requirements))),
      isEnrolled,
    }
  })

/** Feedback is written as markdown by the evaluator, so it is rendered rather than printed. */
async function toLearnerSubmission(
  row: {
    id: number
    createdAt: Date
    answers: unknown
    assignmentStatus: string | null
    isDraft: boolean
    comments: string | null
  },
  requirements: SubmissionRequirement[],
): Promise<LearnerSubmission> {
  return {
    id: row.id,
    submittedAt: row.createdAt,
    status: toLearnerStatus(row.assignmentStatus, row.isDraft),
    fields: await toRenderedSubmissionFields(row.answers, requirements),
    commentsHtml: row.comments ? (await renderMarkdown(row.comments)).markup : null,
  }
}

/**
 * The same derivation the evaluation pages do in SQL (`EFFECTIVE_STATUS`), for a single row: no
 * stored status means waiting, a draft is called out separately, and anything unrecognized reads
 * as pending rather than reaching the UI as a status it has no label for.
 */
function toLearnerStatus(assignmentStatus: string | null, isDraft: boolean) {
  if (!assignmentStatus || assignmentStatus === "PENDING") return isDraft ? "DRAFT" : "PENDING"
  return ASSIGNMENT_STATUS_VALUES.includes(assignmentStatus)
    ? (assignmentStatus as AssignmentStatus)
    : "PENDING"
}
