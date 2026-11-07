import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm"
import type { SQL } from "drizzle-orm"
import type { AnyPgColumn } from "drizzle-orm/pg-core"

import { ACTIVE_SUBSCRIPTION_STATUSES } from "@/lib/config"
import { accountColumns, accountNotDeleted, escapeLikePattern } from "@/lib/db.server"
import {
  accountSubscriptions,
  accounts,
  courseAssignmentSubmissions,
  courseEnrollments,
  coursePayments,
  courseSectionProgress,
  courses,
  db,
  emailAccountAttempts,
  gists,
  githubAccounts,
  googleAccounts,
  quizQuestionAttempts,
} from "@/lib/schema.server"
import type { SortOrder } from "@/types/common"
import type {
  ManagedUserRow,
  ManageUsersFilter,
  ManageUsersSortField,
  UserEnrollmentSummary,
} from "@/types/user"

import { PAYMENT_FAILED_SUBSCRIPTION_STATUSES, PAYMENT_STATUS_SUCCEEDED } from "./constants"

export async function readManagedUsersCount(filter: ManageUsersFilter): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`count(*)` })
    .from(accounts)
    .where(toUsersWhere(filter))

  return Number(row?.total ?? 0)
}

export async function readManagedUsers(
  filter: ManageUsersFilter,
  page: { sort: ManageUsersSortField; order: SortOrder; limit: number; offset: number },
): Promise<ManagedUserRow[]> {
  const direction = page.order === "desc" ? desc : asc

  return (
    db
      .select(accountColumns)
      .from(accounts)
      .where(toUsersWhere(filter))
      // `accounts.id` breaks ties so a user can't appear on two pages, or on none.
      .orderBy(direction(usersSortColumn(page.sort)), direction(accounts.id))
      .limit(page.limit)
      .offset(page.offset)
  )
}

/** Live enrollments for one page of users, newest first — an index lookup per account. */
export async function readEnrollmentsForAccounts(
  accountIds: number[],
): Promise<(UserEnrollmentSummary & { accountId: number })[]> {
  if (!accountIds.length) return []

  return db
    .select({
      accountId: courseEnrollments.enrolleeId,
      courseSlug: courses.slug,
      courseTitle: courses.title,
      enrolledAt: courseEnrollments.createdAt,
      // Paid courses were free for years and admins enroll people by hand, so a paid course
      // counts as paid only with a succeeded charge for it, or while they subscribe to Pro.
      paid: sql<boolean>`exists (
        select 1 from ${coursePayments}
        where ${coursePayments.enrolleeId} = ${courseEnrollments.enrolleeId}
          and ${coursePayments.courseId} = ${courseEnrollments.courseId}
          and ${coursePayments.paymentStatus} = ${PAYMENT_STATUS_SUCCEEDED}
      ) or (
        coalesce(${courses.isPaid}, false)
        and ${courseEnrollments.enrolleeId} in ${activeSubscriberIds}
      )`,
    })
    .from(courseEnrollments)
    .innerJoin(courses, and(eq(courses.id, courseEnrollments.courseId), eq(courses.deleted, false)))
    .where(
      and(inArray(courseEnrollments.enrolleeId, accountIds), eq(courseEnrollments.deleted, false)),
    )
    .orderBy(desc(courseEnrollments.createdAt))
}

/** Each subscription these accounts hold that grants access or failed to renew, newest first. */
export async function readCurrentSubscriptions(accountIds: number[]): Promise<
  {
    accountId: number
    stripeSubscriptionId: string
    stripePriceId: string | null
    status: string
    cancelAtPeriodEnd: boolean
  }[]
> {
  if (!accountIds.length) return []

  return db
    .select({
      accountId: accountSubscriptions.accountId,
      stripeSubscriptionId: accountSubscriptions.stripeSubscriptionId,
      stripePriceId: accountSubscriptions.stripePriceId,
      status: accountSubscriptions.status,
      cancelAtPeriodEnd: accountSubscriptions.cancelAtPeriodEnd,
    })
    .from(accountSubscriptions)
    .where(
      and(
        inArray(accountSubscriptions.accountId, accountIds),
        inArray(accountSubscriptions.status, [
          ...ACTIVE_SUBSCRIPTION_STATUSES,
          ...PAYMENT_FAILED_SUBSCRIPTION_STATUSES,
        ]),
      ),
    )
    .orderBy(desc(accountSubscriptions.createdAt))
}

/**
 * When each account last did anything, from the same tables as the activity feed and the
 * active-users metric. Each lookup hits the table's account index; the `+ interval '0 s'` stops
 * Postgres answering `max()` by walking the timestamp index backwards, which for an account
 * with no rows in that table means reading the whole index.
 */
export async function readLastActiveAt(accountIds: number[]): Promise<Map<number, Date>> {
  if (!accountIds.length) return new Map()

  const latest = (column: SQL | AnyPgColumn, table: SQL, where: SQL) =>
    sql`(select max(${column} + interval '0 s') from ${table} where ${where})`

  const rows = await db
    .select({
      id: accounts.id,
      lastActiveAt: sql<Date>`greatest(
        ${accounts.createdAt},
        ${latest(emailAccountAttempts.createdAt, sql`${emailAccountAttempts}`, sql`${emailAccountAttempts.email} = ${accounts.email} and ${emailAccountAttempts.consumed}`)},
        ${latest(googleAccounts.createdAt, sql`${googleAccounts}`, sql`${googleAccounts.accountId} = ${accounts.id}`)},
        ${latest(githubAccounts.createdAt, sql`${githubAccounts}`, sql`${githubAccounts.accountId} = ${accounts.id}`)},
        ${latest(courseEnrollments.createdAt, sql`${courseEnrollments}`, sql`${courseEnrollments.enrolleeId} = ${accounts.id}`)},
        ${latest(sql`coalesce(${courseSectionProgress.updatedAt}, ${courseSectionProgress.createdAt})`, sql`${courseSectionProgress}`, sql`${courseSectionProgress.enrolleeId} = ${accounts.id}`)},
        ${latest(courseAssignmentSubmissions.createdAt, sql`${courseAssignmentSubmissions}`, sql`${courseAssignmentSubmissions.enrolleeId} = ${accounts.id}`)},
        ${latest(quizQuestionAttempts.createdAt, sql`${quizQuestionAttempts}`, sql`${quizQuestionAttempts.accountId} = ${accounts.id}`)},
        ${latest(sql`coalesce(${gists.updatedAt}, ${gists.createdAt})`, sql`${gists}`, sql`${gists.accountId} = ${accounts.id}`)},
        ${latest(coursePayments.createdAt, sql`${coursePayments}`, sql`${coursePayments.enrolleeId} = ${accounts.id}`)},
        ${latest(accountSubscriptions.createdAt, sql`${accountSubscriptions}`, sql`${accountSubscriptions.accountId} = ${accounts.id}`)}
      )`.mapWith(accounts.createdAt),
    })
    .from(accounts)
    .where(inArray(accounts.id, accountIds))

  return new Map(rows.map((row) => [row.id, row.lastActiveAt]))
}

function toUsersWhere(filter: ManageUsersFilter) {
  const conditions: (SQL | undefined)[] = [accountNotDeleted]

  if (filter.role === "enrolled") conditions.push(inArray(accounts.id, enrolleeIds))
  if (filter.role === "subscribers") conditions.push(inArray(accounts.id, activeSubscriberIds))
  if (filter.role === "buyers") conditions.push(inArray(accounts.id, coursePurchaserIds))
  if (filter.role === "admins") conditions.push(eq(accounts.isAdmin, true))
  if (filter.role === "spammers") conditions.push(eq(accounts.flaggedAsSpammer, true))

  // A substring match scans every account (about a second at 500k), which admins accept for
  // finding "priya" anywhere in a name; a trigram index would make it instant.
  if (filter.search) {
    const pattern = `%${escapeLikePattern(filter.search)}%`
    conditions.push(or(ilike(accounts.name, pattern), ilike(accounts.email, pattern)))
  }

  return and(...conditions)
}

/** Accounts with at least one live enrollment, in any course. */
const enrolleeIds = db
  .select({ accountId: courseEnrollments.enrolleeId })
  .from(courseEnrollments)
  .where(eq(courseEnrollments.deleted, false))

const activeSubscriberIds = db
  .select({ accountId: accountSubscriptions.accountId })
  .from(accountSubscriptions)
  .where(inArray(accountSubscriptions.status, ACTIVE_SUBSCRIPTION_STATUSES))

/**
 * Paid courses were free for years, and admins enroll people by hand, so enrolling in one
 * says nothing about paying — a succeeded charge does.
 */
const coursePurchaserIds = db
  .select({ accountId: coursePayments.enrolleeId })
  .from(coursePayments)
  .where(eq(coursePayments.paymentStatus, PAYMENT_STATUS_SUCCEEDED))

function usersSortColumn(sort: ManageUsersSortField) {
  if (sort === "name") return accounts.name
  if (sort === "email") return accounts.email
  return accounts.createdAt
}
