import { createServerFn } from "@tanstack/react-start"

import { adminMiddleware } from "@/lib/utils"
import type {
  AssignmentStatusCounts,
  AssignmentSubmission,
  AssignmentSubmissionsPage,
  AssignmentSubmissionsSearch,
} from "@/types/evaluation"

import {
  readAssignmentBySlugForEvaluation,
  readAssignmentStatusCounts,
  readAssignmentSubmissions,
  readAssignmentSubmissionsCount,
} from "../-lib/db.server"
import { toSubmissionRequirements } from "../../../-lib/utils"
import { toRenderedSubmissionFields } from "../../../-lib/utils.server"

const EMPTY_COUNTS: AssignmentStatusCounts = {
  PASS: 0,
  FAIL: 0,
  PENDING: 0,
  DRAFT: 0,
  PROCESSING: 0,
}

const EMPTY_PAGE: AssignmentSubmissionsPage = {
  assignment: null,
  submissions: [],
  statusCounts: EMPTY_COUNTS,
  totalSubmissions: 0,
  totalPages: 0,
}

/**
 * One page of an assignment's submissions, one row per enrollee. Four indexed queries whatever
 * the page size, with filtering, sorting and paging all done in the database — a popular
 * assignment can have tens of thousands of submissions, too many to load in full.
 */
export const loadAssignmentSubmissions = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .validator(
    (data: { courseSlug: string; sectionSlug: string } & AssignmentSubmissionsSearch) => data,
  )
  .handler(async ({ data }): Promise<AssignmentSubmissionsPage> => {
    const assignment = await readAssignmentBySlugForEvaluation(data.courseSlug, data.sectionSlug)
    if (!assignment) return EMPTY_PAGE

    const filter = {
      courseId: assignment.courseId,
      sectionId: assignment.sectionId,
      search: data.q.trim(),
      status: data.status,
    }

    const [statusCounts, totalSubmissions, rows] = await Promise.all([
      readAssignmentStatusCounts(assignment.courseId, assignment.sectionId),
      readAssignmentSubmissionsCount(filter),
      readAssignmentSubmissions(filter, {
        sort: data.sort,
        order: data.order,
        limit: data.perPage,
        offset: (data.page - 1) * data.perPage,
      }),
    ])

    const requirements = toSubmissionRequirements(assignment.submissionRequirements)
    const submissions = await Promise.all(
      rows.map(async (row): Promise<AssignmentSubmission> => {
        return {
          id: row.id,
          status: row.status,
          submittedAt: row.submittedAt,
          comments: row.comments,
          fields: await toRenderedSubmissionFields(row.answers, requirements),
          submitter: {
            accountId: row.accountId,
            name: row.name,
            username: row.username,
            email: row.email,
          },
          // The evaluator is cleared whenever a submission goes back in the queue.
          evaluator: row.evaluatorUsername
            ? { name: row.evaluatorName ?? row.evaluatorUsername, username: row.evaluatorUsername }
            : null,
        }
      }),
    )

    return {
      assignment: {
        sectionId: assignment.sectionId,
        courseId: assignment.courseId,
        courseSlug: assignment.courseSlug,
        courseTitle: assignment.courseTitle,
        assignmentSlug: assignment.assignmentSlug,
        assignmentTitle: assignment.assignmentTitle,
      },
      submissions,
      statusCounts: {
        ...EMPTY_COUNTS,
        ...Object.fromEntries(statusCounts.map((count) => [count.status, count.total])),
      },
      totalSubmissions,
      totalPages: Math.ceil(totalSubmissions / data.perPage),
    }
  })
