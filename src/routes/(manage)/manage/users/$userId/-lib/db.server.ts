import { and, desc, eq, gte, inArray, isNull, ne, or, sql, type SQL } from "drizzle-orm"
import { alias, unionAll, type AnyPgColumn, type PgTable } from "drizzle-orm/pg-core"

import { EFFECTIVE_STATUS } from "@/lib/db.server"
import {
  accountIntegrations,
  accountSubscriptions,
  accounts,
  courseAssignmentSubmissions,
  courseCertificates,
  courseEnrollments,
  coursePayments,
  courseSectionProgress,
  courseSections,
  courses,
  db,
  emailAccountAttempts,
  gists,
  githubAccounts,
  googleAccounts,
  questions,
  quizQuestionAttempts,
  quizzes,
  type Queryable,
} from "@/lib/schema.server"
import { normalizeEmail } from "@/lib/utils"
import type {
  ManagedUserEnrollment,
  ManagedUserNotebook,
  ManagedUserProfile,
  ManagedUserQuizSummary,
  ManagedUserSubmission,
  UserActivity,
  UserActivityRow,
  UserDeletionCounts,
} from "@/types/user"

import { toUserActivity } from "../../../-lib/utils.server"
import { COURSE_CERTIFICATION_STATUS_REVOKED } from "../../../../../course/$courseSlug_.manage/participants/-lib/constants"
import { SECTION_COMPLETE_PROGRESS } from "../../../../../course/-lib/constants"

const evaluators = alias(accounts, "evaluators")

export async function readAccountSignInMethods(
  accountId: number,
): Promise<ManagedUserProfile["signInMethods"]> {
  const rows = await unionAll(
    db
      .select({
        provider: sql<"google" | "github">`'google'`.as("provider"),
        identity: googleAccounts.email,
        linkedAt: googleAccounts.createdAt,
      })
      .from(googleAccounts)
      .where(eq(googleAccounts.accountId, accountId)),
    db
      .select({
        provider: sql<"google" | "github">`'github'`.as("provider"),
        identity: githubAccounts.username,
        linkedAt: githubAccounts.createdAt,
      })
      .from(githubAccounts)
      .where(eq(githubAccounts.accountId, accountId)),
  )

  return rows
}

/**
 * Live enrollments with their certificate, if any. A revoked certificate keeps its row, so it
 * is left out of the join rather than linked — the same rule the participants table follows.
 */
export async function readUserEnrollments(
  accountId: number,
): Promise<
  (Omit<
    ManagedUserEnrollment,
    "completedLessons" | "totalLessons" | "completedAssignments" | "totalAssignments"
  > & { courseId: number })[]
> {
  return db
    .select({
      courseId: courses.id,
      courseSlug: courses.slug,
      courseTitle: courses.title,
      enrolledAt: courseEnrollments.createdAt,
      paymentStatus: courseEnrollments.paymentStatus,
      certificationStatus: courseEnrollments.certificationStatus,
      certificateSlug: courseCertificates.slug,
    })
    .from(courseEnrollments)
    .innerJoin(courses, and(eq(courses.id, courseEnrollments.courseId), eq(courses.deleted, false)))
    .leftJoin(
      courseCertificates,
      and(
        eq(courseCertificates.courseId, courseEnrollments.courseId),
        eq(courseCertificates.ownerId, courseEnrollments.enrolleeId),
        eq(courseCertificates.deleted, false),
        or(
          isNull(courseEnrollments.certificationStatus),
          ne(courseEnrollments.certificationStatus, COURSE_CERTIFICATION_STATUS_REVOKED),
        ),
      ),
    )
    .where(and(eq(courseEnrollments.enrolleeId, accountId), eq(courseEnrollments.deleted, false)))
    .orderBy(desc(courseEnrollments.createdAt))
}

/** Completed live sections per course and section type, in one grouped pass. */
export async function readUserSectionCompletionCounts(
  accountId: number,
): Promise<{ courseId: number; sectionType: string | null; completed: number }[]> {
  const rows = await db
    .select({
      courseId: courseSections.courseId,
      sectionType: courseSections.sectionType,
      completed: sql<number>`count(*)`,
    })
    .from(courseSectionProgress)
    .innerJoin(
      courseSections,
      and(
        eq(courseSections.id, courseSectionProgress.sectionId),
        eq(courseSections.deleted, false),
      ),
    )
    .where(
      and(
        eq(courseSectionProgress.enrolleeId, accountId),
        eq(courseSectionProgress.deleted, false),
        gte(courseSectionProgress.progress, SECTION_COMPLETE_PROGRESS),
      ),
    )
    .groupBy(courseSections.courseId, courseSections.sectionType)

  return rows.map((row) => ({ ...row, completed: Number(row.completed ?? 0) }))
}

/** Every attempt, not just the effective one per assignment — an admin wants the history. */
export async function readUserSubmissions(accountId: number): Promise<ManagedUserSubmission[]> {
  const rows = await db
    .select({
      id: courseAssignmentSubmissions.id,
      courseSlug: courses.slug,
      courseTitle: courses.title,
      assignmentSlug: courseSections.slug,
      assignmentTitle: courseSections.title,
      submittedAt: courseAssignmentSubmissions.createdAt,
      updatedAt: courseAssignmentSubmissions.updatedAt,
      status: EFFECTIVE_STATUS,
      evaluatorName: evaluators.name,
      evaluatorUsername: evaluators.username,
      comments: courseAssignmentSubmissions.comments,
    })
    .from(courseAssignmentSubmissions)
    .innerJoin(courseSections, eq(courseSections.id, courseAssignmentSubmissions.sectionId))
    .innerJoin(courses, eq(courses.id, courseSections.courseId))
    .leftJoin(evaluators, eq(evaluators.id, courseAssignmentSubmissions.evaluatorId))
    .where(
      and(
        eq(courseAssignmentSubmissions.enrolleeId, accountId),
        eq(courseAssignmentSubmissions.deleted, false),
      ),
    )
    .orderBy(desc(courseAssignmentSubmissions.createdAt))

  return rows.map(({ updatedAt, evaluatorName, evaluatorUsername, ...row }) => ({
    ...row,
    evaluatedAt: row.status === "PASS" || row.status === "FAIL" ? updatedAt : null,
    evaluator:
      evaluatorName !== null && evaluatorUsername !== null
        ? { name: evaluatorName, username: evaluatorUsername }
        : null,
  }))
}

export async function readUserCoursePayments(accountId: number) {
  return db
    .select({
      paymentIntentId: coursePayments.paymentIntentId,
      courseSlug: courses.slug,
      courseTitle: courses.title,
      amount: coursePayments.amount,
      currency: coursePayments.currency,
      status: coursePayments.paymentStatus,
      createdAt: coursePayments.createdAt,
    })
    .from(coursePayments)
    .leftJoin(courses, eq(courses.id, coursePayments.courseId))
    .where(eq(coursePayments.enrolleeId, accountId))
    .orderBy(desc(coursePayments.createdAt))
}

/** Every subscription the account ever held, lapsed ones included. */
export async function readUserSubscriptions(accountId: number) {
  return db
    .select({
      stripeSubscriptionId: accountSubscriptions.stripeSubscriptionId,
      status: accountSubscriptions.status,
      createdAt: accountSubscriptions.createdAt,
      currentPeriodEnd: accountSubscriptions.currentPeriodEnd,
      cancelAtPeriodEnd: accountSubscriptions.cancelAtPeriodEnd,
    })
    .from(accountSubscriptions)
    .where(eq(accountSubscriptions.accountId, accountId))
    .orderBy(desc(accountSubscriptions.createdAt))
}

/** `quiz_question_attempts` holds one row per answer, so it's summarized per quiz here. */
export async function readUserQuizSummaries(accountId: number): Promise<ManagedUserQuizSummary[]> {
  const rows = await db
    .select({
      quizSlug: quizzes.urlSlug,
      quizTitle: quizzes.displayTitle,
      answered: sql<number>`count(*)`,
      correct: sql<number>`count(*) filter (where ${quizQuestionAttempts.isCorrect})`,
      firstAttemptAt: sql<Date>`min(${quizQuestionAttempts.createdAt})`.mapWith(
        quizQuestionAttempts.createdAt,
      ),
      lastAttemptAt: sql<Date>`max(${quizQuestionAttempts.createdAt})`.mapWith(
        quizQuestionAttempts.createdAt,
      ),
    })
    .from(quizQuestionAttempts)
    .innerJoin(quizzes, eq(quizzes.id, quizQuestionAttempts.quizId))
    .where(eq(quizQuestionAttempts.accountId, accountId))
    .groupBy(quizzes.id)
    .orderBy(desc(sql`max(${quizQuestionAttempts.createdAt})`))

  return rows.map((row) => ({
    ...row,
    quizTitle: row.quizTitle ?? row.quizSlug,
    answered: Number(row.answered),
    correct: Number(row.correct),
  }))
}

export async function readUserNotebooks(
  accountId: number,
  limit: number,
): Promise<ManagedUserNotebook[]> {
  const rows = await db
    .select({
      id: gists.id,
      title: gists.title,
      slug: gists.slug,
      visibility: gists.visibility,
      createdAt: gists.createdAt,
      updatedAt: gists.updatedAt,
    })
    .from(gists)
    .where(and(eq(gists.accountId, accountId), eq(gists.deleted, false)))
    .orderBy(desc(sql`coalesce(${gists.updatedAt}, ${gists.createdAt})`), desc(gists.id))
    .limit(limit)

  return rows.map(({ slug, ...row }) => ({
    ...row,
    title: row.title || slug,
    updatedAt: row.updatedAt ?? row.createdAt,
  }))
}

export async function readUserNotebooksCount(accountId: number): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`count(*)` })
    .from(gists)
    .where(and(eq(gists.accountId, accountId), eq(gists.deleted, false)))

  return Number(row?.total ?? 0)
}

export async function readUserEvaluationsGivenCount(accountId: number): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`count(*)` })
    .from(courseAssignmentSubmissions)
    .where(
      and(
        eq(courseAssignmentSubmissions.evaluatorId, accountId),
        eq(courseAssignmentSubmissions.deleted, false),
      ),
    )

  return Number(row?.total ?? 0)
}

/**
 * The account's most recent activity across every table that records some, newest first. Each
 * branch is an index lookup on the account (or its email), so this stays cheap however long
 * someone has been around; quiz answers are rolled up per quiz per day so they don't drown
 * out the rest. The account's "last active" is simply the first row.
 */
export async function readUserActivity(
  account: { id: number; email: string },
  limit: number,
): Promise<UserActivity[]> {
  const { id, email } = account
  const notDeleted = (column: AnyPgColumn) => sql`coalesce(${column}, false) = false`

  const result = await db.execute<UserActivityRow>(sql`
    select * from (
      select 'SIGNED_UP' as kind, ${accounts.createdAt} as at, null as course_slug,
        null as course_title, null as subject, null as subject_slug, null as detail,
        null::bigint as count, null as extra
      from ${accounts} where ${accounts.id} = ${id}

      union all
      select 'SIGNED_IN', ${emailAccountAttempts.createdAt}, null, null, null, null, null, null, null
      from ${emailAccountAttempts}
      where ${emailAccountAttempts.email} = ${email} and ${emailAccountAttempts.consumed}

      union all
      select 'LINKED_PROVIDER', ${googleAccounts.createdAt}, null, null, 'Google', null,
        ${googleAccounts.email}, null, null
      from ${googleAccounts} where ${googleAccounts.accountId} = ${id}

      union all
      select 'LINKED_PROVIDER', ${githubAccounts.createdAt}, null, null, 'GitHub', null,
        ${githubAccounts.username}, null, null
      from ${githubAccounts} where ${githubAccounts.accountId} = ${id}

      union all
      select 'ENROLLED', ${courseEnrollments.createdAt}, ${courses.slug}, ${courses.title}, null,
        null, ${courseEnrollments.paymentStatus}, null, null
      from ${courseEnrollments}
      join ${courses} on ${courses.id} = ${courseEnrollments.courseId}
      where ${courseEnrollments.enrolleeId} = ${id}

      union all
      select 'SECTION_PROGRESS',
        coalesce(${courseSectionProgress.updatedAt}, ${courseSectionProgress.createdAt}),
        ${courses.slug}, ${courses.title}, ${courseSections.title}, ${courseSections.slug},
        ${courseSections.sectionType}, ${courseSectionProgress.progress}, null
      from ${courseSectionProgress}
      join ${courseSections} on ${courseSections.id} = ${courseSectionProgress.sectionId}
      join ${courses} on ${courses.id} = ${courseSections.courseId}
      where ${courseSectionProgress.enrolleeId} = ${id}
        and ${notDeleted(courseSectionProgress.deleted)}

      union all
      select 'SUBMITTED', ${courseAssignmentSubmissions.createdAt}, ${courses.slug},
        ${courses.title}, ${courseSections.title}, ${courseSections.slug},
        case when ${courseAssignmentSubmissions.isDraft} then 'DRAFT' end, null, null
      from ${courseAssignmentSubmissions}
      join ${courseSections} on ${courseSections.id} = ${courseAssignmentSubmissions.sectionId}
      join ${courses} on ${courses.id} = ${courseSections.courseId}
      where ${courseAssignmentSubmissions.enrolleeId} = ${id}
        and ${notDeleted(courseAssignmentSubmissions.deleted)}

      union all
      select 'EVALUATED', ${courseAssignmentSubmissions.updatedAt}, ${courses.slug},
        ${courses.title}, ${courseSections.title}, ${courseSections.slug},
        ${courseAssignmentSubmissions.assignmentStatus}, null, ${evaluators.name}
      from ${courseAssignmentSubmissions}
      join ${courseSections} on ${courseSections.id} = ${courseAssignmentSubmissions.sectionId}
      join ${courses} on ${courses.id} = ${courseSections.courseId}
      left join ${accounts} as evaluators on ${evaluators.id} = ${courseAssignmentSubmissions.evaluatorId}
      where ${courseAssignmentSubmissions.enrolleeId} = ${id}
        and ${notDeleted(courseAssignmentSubmissions.deleted)}
        and ${courseAssignmentSubmissions.assignmentStatus} in ('PASS', 'FAIL')
        and ${courseAssignmentSubmissions.updatedAt} is not null

      union all
      select 'QUIZ', max(${quizQuestionAttempts.createdAt}), null, null,
        ${quizzes.displayTitle}, ${quizzes.urlSlug}, null, count(*),
        (count(*) filter (where ${quizQuestionAttempts.isCorrect}))::text
      from ${quizQuestionAttempts}
      join ${quizzes} on ${quizzes.id} = ${quizQuestionAttempts.quizId}
      where ${quizQuestionAttempts.accountId} = ${id}
      group by ${quizzes.id}, date_trunc('day', ${quizQuestionAttempts.createdAt})

      union all
      select 'NOTEBOOK', coalesce(${gists.updatedAt}, ${gists.createdAt}), null, null,
        coalesce(${gists.title}, ${gists.slug}), ${gists.slug}, ${gists.visibility}, null, null
      from ${gists} where ${gists.accountId} = ${id} and ${notDeleted(gists.deleted)}

      union all
      select 'PAYMENT', ${coursePayments.createdAt}, ${courses.slug}, ${courses.title}, null,
        null, ${coursePayments.paymentStatus}, ${coursePayments.amount}, ${coursePayments.currency}
      from ${coursePayments}
      left join ${courses} on ${courses.id} = ${coursePayments.courseId}
      where ${coursePayments.enrolleeId} = ${id}

      union all
      select 'SUBSCRIBED', ${accountSubscriptions.createdAt}, null, null, null, null,
        ${accountSubscriptions.status}, null, null
      from ${accountSubscriptions} where ${accountSubscriptions.accountId} = ${id}

      union all
      select 'CERTIFIED', ${courseCertificates.issuedAt}, ${courses.slug}, ${courses.title}, null,
        ${courseCertificates.slug}, null, null, null
      from ${courseCertificates}
      join ${courses} on ${courses.id} = ${courseCertificates.courseId}
      where ${courseCertificates.ownerId} = ${id}
        and ${notDeleted(courseCertificates.deleted)}
        and ${courseCertificates.issuedAt} is not null
    ) activity
    where at is not null
    order by at desc
    limit ${limit}
  `)

  return result.rows.map(toUserActivity)
}

/** One pass over every table an account reaches, each count an index lookup on its id. */
export async function readUserDeletionCounts(
  accountId: number,
  email: string,
): Promise<UserDeletionCounts> {
  const count = (table: PgTable, where: SQL) =>
    sql<number>`(select count(*)::int from ${table} where ${where})`

  const [counts] = await db
    .select({
      enrollments: count(courseEnrollments, eq(courseEnrollments.enrolleeId, accountId)),
      sectionProgress: count(
        courseSectionProgress,
        eq(courseSectionProgress.enrolleeId, accountId),
      ),
      submissions: count(
        courseAssignmentSubmissions,
        eq(courseAssignmentSubmissions.enrolleeId, accountId),
      ),
      certificates: count(courseCertificates, eq(courseCertificates.ownerId, accountId)),
      quizAnswers: count(quizQuestionAttempts, eq(quizQuestionAttempts.accountId, accountId)),
      notebooks: count(gists, eq(gists.accountId, accountId)),
      subscriptions: count(accountSubscriptions, eq(accountSubscriptions.accountId, accountId)),
      signInMethods: sql<number>`${count(googleAccounts, eq(googleAccounts.accountId, accountId))}
        + ${count(githubAccounts, eq(githubAccounts.accountId, accountId))}`,
      integrations: count(accountIntegrations, eq(accountIntegrations.accountId, accountId)),
      loginAttempts: count(emailAccountAttempts, attemptsForEmail(email)),
      payments: count(coursePayments, eq(coursePayments.enrolleeId, accountId)),
      evaluations: count(
        courseAssignmentSubmissions,
        eq(courseAssignmentSubmissions.evaluatorId, accountId),
      ),
      authoredQuestions: count(questions, eq(questions.creatorId, accountId)),
      ownedCourses: count(courses, eq(courses.ownerId, accountId)),
    })
    .from(accounts)
    .where(eq(accounts.id, accountId))

  return counts
}

/** Every certificate row, issued or not, since any of them may have assets under its slug. */
export async function readUserCertificates(accountId: number) {
  return db
    .select({
      slug: courseCertificates.slug,
      courseTitle: courses.title,
      issuedAt: courseCertificates.issuedAt,
      deleted: courseCertificates.deleted,
    })
    .from(courseCertificates)
    .innerJoin(courses, eq(courses.id, courseCertificates.courseId))
    .where(eq(courseCertificates.ownerId, accountId))
    .orderBy(desc(courseCertificates.issuedAt))
}

export async function readUserNotebookSlugs(accountId: number): Promise<string[]> {
  const rows = await db
    .select({ slug: gists.slug })
    .from(gists)
    .where(eq(gists.accountId, accountId))
  return rows.map((row) => row.slug)
}

/** Other learners' resubmissions can point at this account's submissions as their original. */
export async function clearOriginalSubmissionLinks(accountId: number, tx: Queryable = db) {
  await tx
    .update(courseAssignmentSubmissions)
    .set({ originalSubmissionId: null })
    .where(
      inArray(
        courseAssignmentSubmissions.originalSubmissionId,
        tx
          .select({ id: courseAssignmentSubmissions.id })
          .from(courseAssignmentSubmissions)
          .where(eq(courseAssignmentSubmissions.enrolleeId, accountId)),
      ),
    )
}

export async function clearSubmissionEvaluator(accountId: number, tx: Queryable = db) {
  await tx
    .update(courseAssignmentSubmissions)
    .set({ evaluatorId: null })
    .where(eq(courseAssignmentSubmissions.evaluatorId, accountId))
}

export async function clearQuestionCreator(accountId: number, tx: Queryable = db) {
  await tx.update(questions).set({ creatorId: null }).where(eq(questions.creatorId, accountId))
}

/** Payments are kept for the accounts, but no longer say who made them. */
export async function clearCoursePaymentEnrollee(accountId: number, tx: Queryable = db) {
  await tx
    .update(coursePayments)
    .set({ enrolleeId: null })
    .where(eq(coursePayments.enrolleeId, accountId))
}

export async function deleteUserQuizAnswers(accountId: number, tx: Queryable = db) {
  await tx.delete(quizQuestionAttempts).where(eq(quizQuestionAttempts.accountId, accountId))
}

export async function deleteUserSectionProgress(accountId: number, tx: Queryable = db) {
  await tx.delete(courseSectionProgress).where(eq(courseSectionProgress.enrolleeId, accountId))
}

export async function deleteUserSubmissions(accountId: number, tx: Queryable = db) {
  await tx
    .delete(courseAssignmentSubmissions)
    .where(eq(courseAssignmentSubmissions.enrolleeId, accountId))
}

export async function deleteUserCertificates(accountId: number, tx: Queryable = db) {
  await tx.delete(courseCertificates).where(eq(courseCertificates.ownerId, accountId))
}

export async function deleteUserEnrollments(accountId: number, tx: Queryable = db) {
  await tx.delete(courseEnrollments).where(eq(courseEnrollments.enrolleeId, accountId))
}

export async function deleteUserSubscriptions(accountId: number, tx: Queryable = db) {
  await tx.delete(accountSubscriptions).where(eq(accountSubscriptions.accountId, accountId))
}

export async function deleteUserNotebooks(accountId: number, tx: Queryable = db) {
  await tx.delete(gists).where(eq(gists.accountId, accountId))
}

export async function deleteUserIntegrations(accountId: number, tx: Queryable = db) {
  await tx.delete(accountIntegrations).where(eq(accountIntegrations.accountId, accountId))
}

export async function deleteUserGithubAccounts(accountId: number, tx: Queryable = db) {
  await tx.delete(githubAccounts).where(eq(githubAccounts.accountId, accountId))
}

export async function deleteUserGoogleAccounts(accountId: number, tx: Queryable = db) {
  await tx.delete(googleAccounts).where(eq(googleAccounts.accountId, accountId))
}

export async function deleteUserLoginAttempts(email: string, tx: Queryable = db) {
  await tx.delete(emailAccountAttempts).where(attemptsForEmail(email))
}

/**
 * Login stores attempts lowercased, but a legacy account's email can be mixed-case, and an
 * exact match would leave a live code behind that signs up a fresh account. Scans the table.
 */
function attemptsForEmail(email: string): SQL {
  return sql`lower(${emailAccountAttempts.email}) = ${normalizeEmail(email)}`
}

export async function deleteAccount(accountId: number, tx: Queryable = db) {
  await tx.delete(accounts).where(eq(accounts.id, accountId))
}

/** Deletion must consider every subscription, including payment retries and paused billing. */
export async function readUserSubscriptionStatuses(accountId: number): Promise<string[]> {
  const rows = await db
    .select({ status: accountSubscriptions.status })
    .from(accountSubscriptions)
    .where(eq(accountSubscriptions.accountId, accountId))
  return rows.map((row) => row.status)
}
