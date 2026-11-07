import { and, asc, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm"
import type { SQL } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"

import { accountNotDeleted, effectiveSubmissions, escapeLikePattern } from "@/lib/db.server"
import {
  type Queryable,
  accounts,
  courseAssignmentSubmissions,
  courseSectionProgress,
  courseSections,
  courses,
  db,
} from "@/lib/schema.server"
import type { AssignmentStatus } from "@/types/assignment"
import type { SortOrder } from "@/types/common"
import type {
  AssignmentSubmissionsFilter,
  AssignmentSubmissionSortField,
  EvaluationDecision,
} from "@/types/evaluation"

/** The assignment being evaluated, together with the course it belongs to. */
export async function readAssignmentBySlugForEvaluation(courseSlug: string, sectionSlug: string) {
  const [assignment] = await db
    .select({
      sectionId: courseSections.id,
      assignmentSlug: courseSections.slug,
      assignmentTitle: courseSections.title,
      submissionRequirements: courseSections.submissionRequirements,
      courseId: courses.id,
      courseSlug: courses.slug,
      courseTitle: courses.title,
    })
    .from(courseSections)
    .innerJoin(courses, eq(courses.id, courseSections.courseId))
    .where(
      and(
        eq(courses.slug, courseSlug),
        eq(courses.deleted, false),
        eq(courseSections.slug, sectionSlug),
        eq(courseSections.deleted, false),
        eq(courseSections.sectionType, "ASSIGNMENT"),
      ),
    )
    .limit(1)

  return assignment ?? null
}

/** How many enrollees hold each status on one assignment, ignoring the table's filters. */
export async function readAssignmentStatusCounts(
  courseId: number,
  sectionId: number,
): Promise<{ status: AssignmentStatus; total: number }[]> {
  const effective = effectiveSubmissions(courseId, sectionId)

  const rows = await db
    .with(effective)
    .select({ status: effective.status, total: sql<number>`count(*)` })
    .from(effective)
    .groupBy(effective.status)

  return rows.map((row) => ({ status: row.status, total: Number(row.total ?? 0) }))
}

export async function readAssignmentSubmissionsCount(
  filter: AssignmentSubmissionsFilter,
): Promise<number> {
  const effective = effectiveSubmissions(filter.courseId, filter.sectionId)

  const [row] = await db
    .with(effective)
    .select({ total: sql<number>`count(*)` })
    .from(effective)
    .innerJoin(accounts, eq(accounts.id, effective.enrolleeId))
    .where(toSubmissionsWhere(filter, effective))

  return Number(row?.total ?? 0)
}

/** One page of an assignment's effective submissions, with their submitter and evaluator. */
export async function readAssignmentSubmissions(
  filter: AssignmentSubmissionsFilter,
  page: { sort: AssignmentSubmissionSortField; order: SortOrder; limit: number; offset: number },
) {
  const effective = effectiveSubmissions(filter.courseId, filter.sectionId)
  const evaluators = alias(accounts, "evaluators")
  const direction = page.order === "desc" ? desc : asc
  const sortColumn = page.sort === "username" ? accounts.username : effective.submittedAt

  return (
    db
      .with(effective)
      .select({
        id: effective.submissionId,
        status: effective.status,
        submittedAt: effective.submittedAt,
        answers: courseAssignmentSubmissions.assignment,
        comments: courseAssignmentSubmissions.comments,
        accountId: accounts.id,
        name: accounts.name,
        username: accounts.username,
        email: accounts.email,
        evaluatorName: evaluators.name,
        evaluatorUsername: evaluators.username,
      })
      .from(effective)
      .innerJoin(
        courseAssignmentSubmissions,
        eq(courseAssignmentSubmissions.id, effective.submissionId),
      )
      .innerJoin(accounts, eq(accounts.id, effective.enrolleeId))
      .leftJoin(evaluators, eq(evaluators.id, courseAssignmentSubmissions.evaluatorId))
      .where(toSubmissionsWhere(filter, effective))
      // The submission id breaks ties so a row can't appear on two pages, or on none.
      .orderBy(direction(sortColumn), asc(effective.submissionId))
      .limit(page.limit)
      .offset(page.offset)
  )
}

/**
 * The bits of a submission the evaluation mutation needs before it writes anything, plus
 * everything the result email is addressed and worded from — one query rather than three
 * follow-ups, since the mutation always needs all of it.
 */
export async function readAssignmentSubmissionById(submissionId: number) {
  const [submission] = await db
    .select({
      id: courseAssignmentSubmissions.id,
      courseId: courseAssignmentSubmissions.courseId,
      sectionId: courseAssignmentSubmissions.sectionId,
      enrolleeId: courseAssignmentSubmissions.enrolleeId,
      createdAt: courseAssignmentSubmissions.createdAt,
      assignmentStatus: courseAssignmentSubmissions.assignmentStatus,
      course: { slug: courses.slug, title: courses.title },
      section: {
        slug: courseSections.slug,
        title: courseSections.title,
        /** Whether this assignment emails its enrollees when an admin grades by hand. */
        evaluationEmailManual: courseSections.evaluationEmailManual,
      },
      enrollee: { name: accounts.name, email: accounts.email },
    })
    .from(courseAssignmentSubmissions)
    .innerJoin(courses, eq(courses.id, courseAssignmentSubmissions.courseId))
    .innerJoin(courseSections, eq(courseSections.id, courseAssignmentSubmissions.sectionId))
    .innerJoin(accounts, eq(accounts.id, courseAssignmentSubmissions.enrolleeId))
    .where(
      and(
        eq(courseAssignmentSubmissions.id, submissionId),
        eq(courseAssignmentSubmissions.deleted, false),
      ),
    )
    .limit(1)

  return submission ?? null
}

/**
 * Whether an enrollee still has a passing submission for an assignment once `excludeId` is
 * discounted — what decides if un-passing one submission also un-completes the section.
 */
export async function readHasOtherPassedSubmission(
  sectionId: number,
  enrolleeId: number,
  excludeSubmissionId: number,
  tx: Queryable = db,
): Promise<boolean> {
  const [submission] = await tx
    .select({ id: courseAssignmentSubmissions.id })
    .from(courseAssignmentSubmissions)
    .where(
      and(
        eq(courseAssignmentSubmissions.sectionId, sectionId),
        eq(courseAssignmentSubmissions.enrolleeId, enrolleeId),
        eq(courseAssignmentSubmissions.assignmentStatus, "PASS"),
        eq(courseAssignmentSubmissions.deleted, false),
        ne(courseAssignmentSubmissions.id, excludeSubmissionId),
      ),
    )
    .limit(1)

  return !!submission
}

/**
 * Shared by the evaluation table's count and page queries, so the pagination totals can't
 * drift from the rows. Both join `accounts`, which is what the search matches against.
 */
function toSubmissionsWhere(
  filter: AssignmentSubmissionsFilter,
  effective: ReturnType<typeof effectiveSubmissions>,
) {
  const conditions: (SQL | undefined)[] = [accountNotDeleted]

  if (filter.status.length) {
    conditions.push(inArray(effective.status, filter.status))
  }
  // Same trade as the participants table: a substring match can't use an index, but it is
  // what an admin looking for "priya" expects. One assignment's queue is small enough.
  if (filter.search) {
    const pattern = `%${escapeLikePattern(filter.search)}%`
    conditions.push(
      or(
        ilike(accounts.name, pattern),
        ilike(accounts.username, pattern),
        ilike(accounts.email, pattern),
      ),
    )
  }

  return and(...conditions)
}

/**
 * Records an admin's verdict. `comments` is what the enrollee sees and `internal_comments` the
 * admin-only copy; both are written together, and both are cleared on requeue.
 */
export async function updateAssignmentSubmissionEvaluation(
  submissionId: number,
  fields: {
    assignmentStatus: EvaluationDecision
    /** Null when moving back to PENDING — nobody owns an unevaluated submission. */
    evaluatorId: number | null
    comments: string | null
  },
  tx: Queryable = db,
): Promise<void> {
  await tx
    .update(courseAssignmentSubmissions)
    .set({
      assignmentStatus: fields.assignmentStatus,
      evaluatorId: fields.evaluatorId,
      comments: fields.comments,
      internalComments: fields.comments,
    })
    .where(eq(courseAssignmentSubmissions.id, submissionId))
}

/**
 * Undoes a section completion after a pass is withdrawn. Nothing is inserted when no
 * progress row exists: an enrollee who was never marked complete has nothing to undo.
 */
export async function updateCourseSectionIncomplete(
  sectionId: number,
  enrolleeId: number,
  tx: Queryable = db,
): Promise<void> {
  await tx
    .update(courseSectionProgress)
    .set({ progress: 0, completedAt: null })
    .where(
      and(
        eq(courseSectionProgress.sectionId, sectionId),
        eq(courseSectionProgress.enrolleeId, enrolleeId),
      ),
    )
}
