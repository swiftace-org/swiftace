import type { AssignmentStatus, SubmissionField } from "@/types/assignment"
import type { SortOrder } from "@/types/common"

/**
 * An enrollee can submit an assignment many times but holds only one status on it: PASS if
 * any submission passed, else whatever their latest says. That submission is their
 * *effective* one, and the only one the dashboard counts — see `effectiveSubmissions`.
 */

/** The statuses an admin can set by hand, as opposed to the derived ones. */
export type EvaluationDecision = "PASS" | "FAIL" | "PENDING"

/** How many enrollees hold each status on one assignment. Keys are always present. */
export type AssignmentStatusCounts = Record<AssignmentStatus, number>

/** One row of the evaluation dashboard: an assignment, its course, and its queue. */
export type AssignmentEvaluationStats = {
  sectionId: number
  courseSlug: string
  courseTitle: string
  assignmentSlug: string
  assignmentTitle: string
  /** Enrollees who have submitted at all — the four status counts add up to this. */
  totalSubmitters: number
  counts: AssignmentStatusCounts
  /** When the longest-waiting pending submission arrived, or null if the queue is empty. */
  oldestPending: Date | null
}

export type EvaluationDashboard = {
  assignments: AssignmentEvaluationStats[]
  /** Every course with at least one assignment, in dashboard order, for the course filter. */
  courses: { slug: string; title: string }[]
}

export type EvaluationDashboardSortField =
  | "course"
  | "assignment"
  | "totalSubmitters"
  | "PASS"
  | "FAIL"
  | "DRAFT"
  | "PENDING"
  | "oldestPending"

export type EvaluationDashboardSearch = {
  /** Matches against the assignment and course titles. */
  q: string
  /** A course slug, or "all". */
  course: string
  /** Hides assignments with an empty pending queue. */
  pendingOnly: boolean
  sort: EvaluationDashboardSortField
  order: SortOrder
}

/** One row of the evaluation table: an enrollee's effective submission for an assignment. */
export type AssignmentSubmission = {
  id: number
  status: AssignmentStatus
  submittedAt: Date
  fields: SubmissionField[]
  /** The feedback the enrollee sees, which is also what the comment box starts with. */
  comments: string | null
  submitter: {
    accountId: number
    name: string
    username: string
    email: string
  }
  evaluator: { name: string; username: string } | null
}

/** The assignment being evaluated, for the page header and its links. */
export type AssignmentEvaluationSummary = {
  sectionId: number
  courseId: number
  courseSlug: string
  courseTitle: string
  assignmentSlug: string
  assignmentTitle: string
}

export type AssignmentSubmissionsPage = {
  /** Null when the slug pair doesn't name a live assignment; the route turns that into a 404. */
  assignment: AssignmentEvaluationSummary | null
  submissions: AssignmentSubmission[]
  /** Every status's count, unaffected by the status filter, so the filter can show totals. */
  statusCounts: AssignmentStatusCounts
  /** Submissions matching the current filters, across every page. */
  totalSubmissions: number
  totalPages: number
}

export type AssignmentSubmissionSortField = "submittedAt" | "username"

export type AssignmentSubmissionsSearch = {
  page: number
  perPage: number
  sort: AssignmentSubmissionSortField
  order: SortOrder
  /** Matches against the submitter's name, username and email. */
  q: string
  /** Statuses to include; empty means every status. */
  status: AssignmentStatus[]
}

/** The filters half of `AssignmentSubmissionsSearch`, resolved to what the queries need. */
export type AssignmentSubmissionsFilter = {
  courseId: number
  sectionId: number
  search: string
  status: AssignmentStatus[]
}
