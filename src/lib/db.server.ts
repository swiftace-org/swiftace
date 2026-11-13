import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm"

import { ACTIVE_SUBSCRIPTION_STATUSES } from "@/lib/config"
import {
  type Queryable,
  accountSubscriptions,
  accounts,
  courseAssignmentSubmissions,
  courseEnrollments,
  courseSections,
  courses,
  db,
  questions,
  quizzes,
  siteConfig,
} from "@/lib/schema.server"
import type { Account } from "@/types/account"
import type { AssignmentStatus } from "@/types/assignment"
import type { AdminCourseDetails, CourseDisplay, CourseSectionType } from "@/types/course"
import type { QuizQuestionRow } from "@/types/quiz"
import type { AccountSubscription } from "@/types/subscription"

import { AUTHENTICATION_CONFIG_SECTION } from "../routes/(auth)/-lib/constants"
import { COURSE_SECTION_VISIBILITY_DRAFT } from "../routes/course/-lib/constants"

export const DEFAULT_RESULTS_LIMIT = 100

export const accountColumns = {
  id: accounts.id,
  name: accounts.name,
  username: accounts.username,
  email: accounts.email,
  isAdmin: accounts.isAdmin,
  flaggedAsSpammer: accounts.flaggedAsSpammer,
  createdAt: accounts.createdAt,
}

/** Listed on the home page and in the sitemap; SECRET courses open by link but stay unlisted. */
export const listedCourse = and(eq(courses.deleted, false), eq(courses.visibility, "PUBLIC"))

/** The order set on Manage Courses. Postgres sorts NULLs last, so an unplaced course lists after. */
export const courseOrder = [asc(courses.position), asc(courses.id)]

export const accountNotDeleted = eq(accounts.deleted, false)

/** Keeps `%`, `_` and `\` in an admin's search box literal instead of wildcards. */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`)
}

export async function readAccountById(accountId: number): Promise<Account | null> {
  const [account] = await db
    .select(accountColumns)
    .from(accounts)
    .where(and(eq(accounts.id, accountId), accountNotDeleted))
    .limit(1)

  return account ?? null
}

export async function readAccountByEmail(
  email: string,
  tx: Queryable = db,
): Promise<Account | null> {
  const [account] = await tx
    .select(accountColumns)
    .from(accounts)
    .where(and(eq(accounts.email, email), accountNotDeleted))
    .limit(1)

  return account ?? null
}

/**
 * Fallback for `readAccountByEmail`: legacy rows may store a mixed-case address, and missing one
 * would duplicate an existing account. Scans, since `accounts_email_key` indexes the raw column.
 */
export async function readAccountByEmailCaseInsensitive(
  email: string,
  tx: Queryable = db,
): Promise<Account | null> {
  const [account] = await tx
    .select(accountColumns)
    .from(accounts)
    .where(and(sql`lower(${accounts.email}) = ${email}`, accountNotDeleted))
    .limit(1)

  return account ?? null
}

export const subscriptionColumns = {
  id: accountSubscriptions.id,
  accountId: accountSubscriptions.accountId,
  stripeCustomerId: accountSubscriptions.stripeCustomerId,
  stripeSubscriptionId: accountSubscriptions.stripeSubscriptionId,
  stripePriceId: accountSubscriptions.stripePriceId,
  status: accountSubscriptions.status,
  currentPeriodEnd: accountSubscriptions.currentPeriodEnd,
  cancelAtPeriodEnd: accountSubscriptions.cancelAtPeriodEnd,
}

/**
 * The account's access-granting subscription, or null. An account can hold several at once
 * (cancel then resubscribe), so this asks whether *any* grants access, and returns the
 * furthest-future period end — `nulls last`, since Postgres sorts NULLs first under `desc`.
 */
export async function readActiveSubscriptionByAccountId(
  accountId: number,
  tx: Queryable = db,
): Promise<AccountSubscription | null> {
  const [subscription] = await tx
    .select(subscriptionColumns)
    .from(accountSubscriptions)
    .where(
      and(
        eq(accountSubscriptions.accountId, accountId),
        inArray(accountSubscriptions.status, ACTIVE_SUBSCRIPTION_STATUSES),
      ),
    )
    .orderBy(
      sql`${accountSubscriptions.currentPeriodEnd} desc nulls last`,
      desc(accountSubscriptions.createdAt),
    )
    .limit(1)

  return subscription ?? null
}

export async function readPublicCourses(
  limit = DEFAULT_RESULTS_LIMIT,
): Promise<(CourseDisplay & { createdAt: Date })[]> {
  return db
    .select({
      id: courses.id,
      slug: courses.slug,
      title: courses.title,
      shortDescription: courses.shortDescription,
      cover: courses.cover,
      isPaid: courses.isPaid,
      visibility: courses.visibility,
      createdAt: courses.createdAt,
    })
    .from(courses)
    .where(listedCourse)
    .orderBy(...courseOrder)
    .limit(limit)
}

export async function readCourseBySlug(slug: string) {
  const [course] = await db
    .select({
      id: courses.id,
      slug: courses.slug,
      title: courses.title,
      shortDescription: courses.shortDescription,
      cover: courses.cover,
      isPaid: courses.isPaid,
      visibility: courses.visibility,
      description: courses.description,
      additionalInformation: courses.additionalInformation,
      videoUrl: courses.videoUrl,
      sections: courses.sections,
    })
    .from(courses)
    .where(and(eq(courses.slug, slug), eq(courses.deleted, false)))
    .limit(1)

  return course ?? null
}

export async function readCourseBySlugForAdmin(slug: string): Promise<AdminCourseDetails | null> {
  const [course] = await db
    .select({
      id: courses.id,
      slug: courses.slug,
      title: courses.title,
      shortDescription: courses.shortDescription,
      description: courses.description,
      cover: courses.cover,
      visibility: courses.visibility,
      videoUrl: courses.videoUrl,
      certificateTemplate: courses.certificateTemplate,
      isPaid: courses.isPaid,
      stripeProductId: courses.stripeProductId,
      additionalInformation: courses.additionalInformation,
    })
    .from(courses)
    .where(and(eq(courses.slug, slug), eq(courses.deleted, false)))
    .limit(1)

  return course ?? null
}

// Match the learner-facing outline, excluding drafts and legacy rows no longer listed there.
// Cast the legacy JSON outline to JSONB before checking slug membership.
export async function readCourseSectionCounts(
  courseIds: number[],
  sectionType: CourseSectionType,
): Promise<Map<number, number>> {
  if (!courseIds.length) return new Map()

  const summaries = await db
    .select({ courseId: courseSections.courseId, total: sql<number>`count(*)` })
    .from(courseSections)
    .innerJoin(courses, eq(courses.id, courseSections.courseId))
    .where(
      and(
        inArray(courseSections.courseId, courseIds),
        eq(courseSections.deleted, false),
        eq(courseSections.sectionType, sectionType),
        sql`${courseSections.visibility} is distinct from ${COURSE_SECTION_VISIBILITY_DRAFT}`,
        sql`jsonb_typeof(${courses.sections}::jsonb) = 'array'`,
        sql`${courses.sections}::jsonb ? ${courseSections.slug}`,
      ),
    )
    .groupBy(courseSections.courseId)

  return new Map(summaries.map((summary) => [summary.courseId, Number(summary.total ?? 0)]))
}

/**
 * A caller's live enrollment, or null. `course_enrollments` is keyed on
 * `(course_id, enrollee_id)` with no `id`, so the enrollee comes back as the existence marker.
 */
export async function readCourseEnrollment(
  courseId: number,
  enrolleeId: number,
): Promise<{ enrolleeId: number; certificationStatus: string | null } | null> {
  const [enrollment] = await db
    .select({
      enrolleeId: courseEnrollments.enrolleeId,
      certificationStatus: courseEnrollments.certificationStatus,
    })
    .from(courseEnrollments)
    .where(
      and(
        eq(courseEnrollments.courseId, courseId),
        eq(courseEnrollments.enrolleeId, enrolleeId),
        eq(courseEnrollments.deleted, false),
      ),
    )
    .limit(1)

  return enrollment ?? null
}

/**
 * A submission's status as the evaluation pages present it: no stored status means the
 * submission is still waiting, and a draft is called out separately from a real attempt.
 */
export const EFFECTIVE_STATUS = sql<AssignmentStatus>`case
  when ${courseAssignmentSubmissions.assignmentStatus} is null
    or ${courseAssignmentSubmissions.assignmentStatus} = 'PENDING'
  then case when ${courseAssignmentSubmissions.isDraft} then 'DRAFT' else 'PENDING' end
  else ${courseAssignmentSubmissions.assignmentStatus} end`

/**
 * Picks the effective submission out of an enrollee's submissions: a pass beats everything,
 * then the most recent attempt, then a real attempt beats a draft when two share a timestamp.
 */
const EFFECTIVE_RANK = [
  sql`case when ${courseAssignmentSubmissions.assignmentStatus} = 'PASS' then 0 else 1 end`,
  desc(courseAssignmentSubmissions.createdAt),
  sql`case
    when ${courseAssignmentSubmissions.assignmentStatus} = 'FAIL' then 1
    when ${courseAssignmentSubmissions.assignmentStatus} is null
      or ${courseAssignmentSubmissions.assignmentStatus} = 'PENDING' then 2
    else 3 end`,
]

export const questionColumns = {
  id: questions.id,
  title: questions.title,
  explanation: questions.explanation,
  answerType: questions.answerType,
  options: questions.options,
  correctAnswer: questions.correctAnswer,
  optional: questions.optional,
}

/** Returned in arbitrary order — callers order by `quizzes.jsonData`, not by id. */
export async function readQuestionsByIds(ids: number[]): Promise<QuizQuestionRow[]> {
  if (!ids.length) return []

  return db
    .select(questionColumns)
    .from(questions)
    .where(and(inArray(questions.id, ids), eq(questions.deleted, false)))
}

/**
 * `quizzes.jsonData` holds an ordered array of question ids (the legacy
 * `Quiz.questions_serialize` behaviour) — question order comes from that array,
 * not from the `quiz_questions` join table.
 */
export async function readQuizBySlug(urlSlug: string) {
  const [quiz] = await db
    .select({
      id: quizzes.id,
      urlSlug: quizzes.urlSlug,
      displayTitle: quizzes.displayTitle,
      shortDescription: quizzes.shortDescription,
      description: quizzes.description,
      visibility: quizzes.visibility,
      jsonData: quizzes.jsonData,
    })
    .from(quizzes)
    .where(and(eq(quizzes.urlSlug, urlSlug), eq(quizzes.deleted, false)))
    .limit(1)

  return quiz ?? null
}

/**
 * The one submission that represents each enrollee, either across every assignment or
 * within a single one. Joining `course_enrollments` is what keeps a submission from someone
 * since removed from the course out of the counts and out of the evaluation queue.
 */
export function effectiveSubmissions(courseId?: number, sectionId?: number) {
  return db.$with("effective_submissions").as(
    db
      .selectDistinctOn(
        [courseAssignmentSubmissions.sectionId, courseAssignmentSubmissions.enrolleeId],
        {
          submissionId: courseAssignmentSubmissions.id,
          sectionId: courseAssignmentSubmissions.sectionId,
          enrolleeId: courseAssignmentSubmissions.enrolleeId,
          submittedAt: courseAssignmentSubmissions.createdAt,
          status: EFFECTIVE_STATUS.as("status"),
        },
      )
      .from(courseAssignmentSubmissions)
      .innerJoin(
        courseSections,
        and(
          eq(courseSections.id, courseAssignmentSubmissions.sectionId),
          eq(courseSections.deleted, false),
          eq(courseSections.sectionType, "ASSIGNMENT"),
        ),
      )
      .innerJoin(
        courseEnrollments,
        and(
          eq(courseEnrollments.courseId, courseSections.courseId),
          eq(courseEnrollments.enrolleeId, courseAssignmentSubmissions.enrolleeId),
          eq(courseEnrollments.deleted, false),
        ),
      )
      .where(
        and(
          eq(courseAssignmentSubmissions.deleted, false),
          courseId === undefined ? undefined : eq(courseSections.courseId, courseId),
          sectionId === undefined
            ? undefined
            : eq(courseAssignmentSubmissions.sectionId, sectionId),
        ),
      )
      // `DISTINCT ON` keeps the first row of each group, so this ordering *is* the choice
      // of effective submission; see `EFFECTIVE_RANK`.
      .orderBy(
        courseAssignmentSubmissions.sectionId,
        courseAssignmentSubmissions.enrolleeId,
        ...EFFECTIVE_RANK,
      ),
  )
}

/**
 * Enrolls an account, reviving a soft-deleted enrollment rather than colliding with the
 * (course_id, enrollee_id) key. Returns false when already actively enrolled. `paymentStatus`
 * records provenance, which is what decides whether a lapse may later revoke it.
 */
export async function createOrRestoreCourseEnrollment(values: {
  courseId: number
  enrolleeId: number
  paymentStatus?: string | null
}): Promise<boolean> {
  const paymentStatus = values.paymentStatus ?? null

  const rows = await db
    .insert(courseEnrollments)
    .values({ ...values, paymentStatus })
    .onConflictDoUpdate({
      target: [courseEnrollments.courseId, courseEnrollments.enrolleeId],
      set: { deleted: false, paymentStatus },
      where: eq(courseEnrollments.deleted, true),
    })
    .returning({ enrolleeId: courseEnrollments.enrolleeId })

  return rows.length > 0
}

/** Every saved `/manage/config` section; one never saved has no row and keeps its defaults. */
export async function readSiteConfigRows(): Promise<{ section: string; data: unknown }[]> {
  return db
    .select({ section: siteConfig.section, data: siteConfig.data })
    .from(siteConfig)
    .where(ne(siteConfig.section, AUTHENTICATION_CONFIG_SECTION))
}
