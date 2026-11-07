import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  ne,
  or,
  sql,
} from "drizzle-orm"
import type { SQL } from "drizzle-orm"

import { accountColumns, accountNotDeleted, escapeLikePattern } from "@/lib/db.server"
import {
  type Queryable,
  accounts,
  courseCertificates,
  courseEnrollments,
  courseSectionProgress,
  courseSections,
  courses,
  db,
} from "@/lib/schema.server"
import type { Account } from "@/types/account"
import type {
  CourseParticipant,
  CourseParticipantsFilter,
  CourseParticipantSortField,
  CourseParticipantSortOrder,
} from "@/types/participant"

import { SECTION_COMPLETE_PROGRESS } from "../../../-lib/constants"
import { COURSE_CERTIFICATION_STATUS_REVOKED } from "./constants"

/**
 * Both `username` and `normalized_username` are uniquely indexed, so this stays an index
 * lookup while still matching the casing an admin happens to type.
 */
export async function readAccountByUsername(username: string): Promise<Account | null> {
  const [account] = await db
    .select(accountColumns)
    .from(accounts)
    .where(
      and(
        or(
          eq(accounts.username, username),
          eq(accounts.normalizedUsername, username.toLowerCase()),
        ),
        accountNotDeleted,
      ),
    )
    .limit(1)

  return account ?? null
}

/**
 * A course's id together with its ordered section slugs, for pages that need both and
 * nothing else — `readCourseBySlugForAdmin` plus `readCourseSectionSlugs` in one round trip.
 */
export async function readCourseSectionSlugsBySlug(
  slug: string,
): Promise<{ courseId: number; sectionSlugs: string[] } | null> {
  const [course] = await db
    .select({ id: courses.id, sections: courses.sections })
    .from(courses)
    .where(and(eq(courses.slug, slug), eq(courses.deleted, false)))
    .limit(1)

  if (!course) return null

  return {
    courseId: course.id,
    sectionSlugs: Array.isArray(course.sections) ? (course.sections as string[]) : [],
  }
}

export async function readCourseParticipantsCount(
  filter: CourseParticipantsFilter,
): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`count(*)` })
    .from(courseEnrollments)
    .innerJoin(accounts, eq(accounts.id, courseEnrollments.enrolleeId))
    .leftJoin(courseCertificates, participantCertificateJoin)
    .where(toParticipantsWhere(filter))

  return Number(row?.total ?? 0)
}

/** Progress counts are not part of this row; see `readCourseSectionCompletionCounts`. */
export async function readCourseParticipants(
  filter: CourseParticipantsFilter,
  page: {
    sort: CourseParticipantSortField
    order: CourseParticipantSortOrder
    limit: number
    offset: number
  },
): Promise<Omit<CourseParticipant, "completedLessons" | "completedAssignments">[]> {
  const direction = page.order === "desc" ? desc : asc

  return (
    db
      .select({
        accountId: accounts.id,
        name: accounts.name,
        username: accounts.username,
        email: accounts.email,
        isStaff: accounts.isAdmin,
        enrolledAt: courseEnrollments.createdAt,
        certificationStatus: courseEnrollments.certificationStatus,
        certificateSlug: courseCertificates.slug,
      })
      .from(courseEnrollments)
      .innerJoin(accounts, eq(accounts.id, courseEnrollments.enrolleeId))
      .leftJoin(courseCertificates, participantCertificateJoin)
      .where(toParticipantsWhere(filter))
      // `accounts.id` breaks ties so a participant can't appear on two pages, or on none.
      .orderBy(direction(participantSortColumn(page.sort)), asc(accounts.id))
      .limit(page.limit)
      .offset(page.offset)
  )
}

/**
 * How many of `sectionIds` each of `enrolleeIds` has completed, split by section type —
 * one grouped query for the whole page rather than a subquery per row.
 */
export async function readCourseSectionCompletionCounts(
  sectionIds: number[],
  enrolleeIds: number[],
): Promise<{ enrolleeId: number; sectionType: string | null; completed: number }[]> {
  if (!sectionIds.length || !enrolleeIds.length) return []

  const rows = await db
    .select({
      enrolleeId: courseSectionProgress.enrolleeId,
      sectionType: courseSections.sectionType,
      completed: sql<number>`count(*)`,
    })
    .from(courseSectionProgress)
    .innerJoin(courseSections, eq(courseSections.id, courseSectionProgress.sectionId))
    .where(
      and(
        inArray(courseSectionProgress.sectionId, sectionIds),
        inArray(courseSectionProgress.enrolleeId, enrolleeIds),
        eq(courseSectionProgress.deleted, false),
        gte(courseSectionProgress.progress, SECTION_COMPLETE_PROGRESS),
      ),
    )
    .groupBy(courseSectionProgress.enrolleeId, courseSections.sectionType)

  return rows.map((row) => ({ ...row, completed: Number(row.completed ?? 0) }))
}

/**
 * Null for a revoked certificate too, matching how the participants table treats a revoked
 * certificate as "no certificate" — otherwise a revoked holder could never be removed.
 */
export async function readCourseCertificateSlugForOwner(
  courseId: number,
  ownerId: number,
): Promise<string | null> {
  const [certificate] = await db
    .select({ slug: courseCertificates.slug })
    .from(courseCertificates)
    .innerJoin(
      courseEnrollments,
      and(
        eq(courseEnrollments.courseId, courseCertificates.courseId),
        eq(courseEnrollments.enrolleeId, courseCertificates.ownerId),
      ),
    )
    .where(
      and(
        eq(courseCertificates.courseId, courseId),
        eq(courseCertificates.ownerId, ownerId),
        eq(courseCertificates.deleted, false),
        or(
          isNull(courseEnrollments.certificationStatus),
          ne(courseEnrollments.certificationStatus, COURSE_CERTIFICATION_STATUS_REVOKED),
        ),
      ),
    )
    .limit(1)

  return certificate?.slug ?? null
}

/**
 * The certificate row for a course and account, soft-deleted ones included: the
 * `(course_id, owner_id)` unique index doesn't exclude them, so re-issuing has to revive
 * the row that's already there rather than insert a second one.
 */
export async function readCourseCertificateForOwner(
  courseId: number,
  ownerId: number,
): Promise<{ id: number } | null> {
  const [certificate] = await db
    .select({ id: courseCertificates.id })
    .from(courseCertificates)
    .where(and(eq(courseCertificates.courseId, courseId), eq(courseCertificates.ownerId, ownerId)))
    .limit(1)

  return certificate ?? null
}

/**
 * `ix_course_certificates_course_id_owner_id` keeps this to at most one row per
 * participant, so joining it can't multiply the result set.
 */
const participantCertificateJoin = and(
  eq(courseCertificates.courseId, courseEnrollments.courseId),
  eq(courseCertificates.ownerId, courseEnrollments.enrolleeId),
  eq(courseCertificates.deleted, false),
)

function toParticipantsWhere(filter: CourseParticipantsFilter) {
  const conditions: (SQL | undefined)[] = [
    eq(courseEnrollments.courseId, filter.courseId),
    eq(courseEnrollments.deleted, false),
    accountNotDeleted,
  ]

  if (filter.hideStaff) {
    conditions.push(eq(accounts.isAdmin, false))
  }
  // A revoked certificate keeps its row but is never shown or linked, so it counts as
  // "no certificate" here. The two branches are exact complements, which is what keeps the
  // two filtered counts adding up to the unfiltered one.
  if (filter.certificate === "issued") {
    conditions.push(
      isNotNull(courseCertificates.id),
      or(
        isNull(courseEnrollments.certificationStatus),
        ne(courseEnrollments.certificationStatus, COURSE_CERTIFICATION_STATUS_REVOKED),
      ),
    )
  }
  if (filter.certificate === "none") {
    conditions.push(
      or(
        isNull(courseCertificates.id),
        eq(courseEnrollments.certificationStatus, COURSE_CERTIFICATION_STATUS_REVOKED),
      ),
    )
  }
  // A substring match can't use the indexes on these columns, so it scans the course's
  // enrollments — around a second on the largest course. Admins want to find "priya"
  // anywhere in a name, so that's the trade being made; a prefix match would be indexed.
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
  if (filter.completedSectionIds.length) {
    conditions.push(
      inArray(courseEnrollments.enrolleeId, completedEverySection(filter.completedSectionIds)),
    )
  }

  return and(...conditions)
}

/**
 * Enrollee ids that have completed *every* one of `sectionIds` — the `having` count is what
 * makes it "all of them" rather than "any of them".
 */
function completedEverySection(sectionIds: number[]) {
  return db
    .select({ enrolleeId: courseSectionProgress.enrolleeId })
    .from(courseSectionProgress)
    .where(
      and(
        inArray(courseSectionProgress.sectionId, sectionIds),
        eq(courseSectionProgress.deleted, false),
        gte(courseSectionProgress.progress, SECTION_COMPLETE_PROGRESS),
      ),
    )
    .groupBy(courseSectionProgress.enrolleeId)
    .having(sql`count(distinct ${courseSectionProgress.sectionId}) = ${sectionIds.length}`)
}

function participantSortColumn(sort: CourseParticipantSortField) {
  if (sort === "email") return accounts.email
  if (sort === "enrolledAt") return courseEnrollments.createdAt
  return accounts.name
}

/**
 * A certificate's slug derives from its own row id, so it can't be known before the insert: the
 * caller passes a throwaway to satisfy the unique index and writes the real slug back after — the
 * legacy two-step, which is why old slugs still resolve. The row starts soft-deleted, so a render
 * or upload that fails halfway leaves nothing to link to.
 */
export async function createCourseCertificate(values: {
  courseId: number
  ownerId: number
  slug: string
}): Promise<{ id: number }> {
  const [certificate] = await db
    .insert(courseCertificates)
    .values({ ...values, deleted: true })
    .returning({ id: courseCertificates.id })

  return certificate
}

/**
 * Writes back the details of a freshly rendered certificate. `deleted` is cleared too, so
 * re-issuing to somebody whose certificate was withdrawn revives their existing row instead
 * of colliding with it on `(course_id, owner_id)`.
 */
export async function updateCourseCertificate(
  certificateId: number,
  fields: { slug: string; printedName: string; issuedAt: Date },
  tx: Queryable = db,
): Promise<void> {
  await tx
    .update(courseCertificates)
    .set({ ...fields, deleted: false })
    .where(eq(courseCertificates.id, certificateId))
}

export async function updateCourseEnrollmentCertificationStatus(
  courseId: number,
  enrolleeId: number,
  certificationStatus: string,
  tx: Queryable = db,
): Promise<void> {
  await tx
    .update(courseEnrollments)
    .set({ certificationStatus })
    .where(
      and(eq(courseEnrollments.courseId, courseId), eq(courseEnrollments.enrolleeId, enrolleeId)),
    )
}

/**
 * Unenrolls a participant. The row is kept so their section progress, submissions and
 * enrollment date survive a re-enrollment; `createOrRestoreCourseEnrollment` brings it back.
 *
 * Returns false when there was no live enrollment to remove, so the caller can report it.
 */
export async function softDeleteCourseEnrollment(
  courseId: number,
  enrolleeId: number,
): Promise<boolean> {
  const removed = await db
    .update(courseEnrollments)
    .set({ deleted: true })
    .where(
      and(
        eq(courseEnrollments.courseId, courseId),
        eq(courseEnrollments.enrolleeId, enrolleeId),
        eq(courseEnrollments.deleted, false),
      ),
    )
    .returning({ enrolleeId: courseEnrollments.enrolleeId })

  return removed.length > 0
}
