import { and, eq, gte, notInArray, sql } from "drizzle-orm"
import type { SQL } from "drizzle-orm"
import { alias, type AnyPgColumn } from "drizzle-orm/pg-core"

import { accountNotDeleted } from "@/lib/db.server"
import {
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
  quizQuestionAttempts,
  quizzes,
} from "@/lib/schema.server"
import type {
  MetricsPeriod,
  PeriodCounts,
  PeriodStarts,
  SubscriptionForMetrics,
} from "@/types/metrics"
import type { SiteActivityCursor, UserActivityRow } from "@/types/user"

import { METRICS_PERIODS } from "./constants"

/**
 * Accounts with any activity in each period, from the same tables as a user's activity feed
 * minus the admin-driven ones (evaluations, certificates). Each branch is a range scan on
 * a timestamp index from the earliest start, so it stays fast however many accounts exist.
 */
export async function readActiveUserCounts(starts: PeriodStarts): Promise<PeriodCounts> {
  const since = toTimestamp(earliestStart(starts))
  const changedSince = (updatedAt: AnyPgColumn, createdAt: AnyPgColumn) =>
    sql`(${updatedAt} >= ${since} or ${createdAt} >= ${since})`

  const result = await db.execute<Record<MetricsPeriod, string>>(sql`
    select ${countsByPeriod(sql`count(distinct account_id)`, sql`at`, starts)}
    from (
      select ${accounts.id} as account_id, ${accounts.createdAt} as at
      from ${accounts} where ${accounts.createdAt} >= ${since}
      union all
      select (select ${accounts.id} from ${accounts} where ${accounts.email} = ${emailAccountAttempts.email}),
        ${emailAccountAttempts.createdAt}
      from ${emailAccountAttempts}
      where ${emailAccountAttempts.createdAt} >= ${since} and ${emailAccountAttempts.consumed}
      union all
      select ${googleAccounts.accountId}, ${googleAccounts.createdAt}
      from ${googleAccounts} where ${googleAccounts.createdAt} >= ${since}
      union all
      select ${githubAccounts.accountId}, ${githubAccounts.createdAt}
      from ${githubAccounts} where ${githubAccounts.createdAt} >= ${since}
      union all
      select ${courseEnrollments.enrolleeId}, ${courseEnrollments.createdAt}
      from ${courseEnrollments} where ${courseEnrollments.createdAt} >= ${since}
      union all
      select ${courseSectionProgress.enrolleeId},
        coalesce(${courseSectionProgress.updatedAt}, ${courseSectionProgress.createdAt})
      from ${courseSectionProgress}
      where ${changedSince(courseSectionProgress.updatedAt, courseSectionProgress.createdAt)}
      union all
      select ${courseAssignmentSubmissions.enrolleeId}, ${courseAssignmentSubmissions.createdAt}
      from ${courseAssignmentSubmissions}
      where ${courseAssignmentSubmissions.createdAt} >= ${since}
      union all
      select ${quizQuestionAttempts.accountId}, ${quizQuestionAttempts.createdAt}
      from ${quizQuestionAttempts} where ${quizQuestionAttempts.createdAt} >= ${since}
      union all
      select ${gists.accountId}, coalesce(${gists.updatedAt}, ${gists.createdAt})
      from ${gists} where ${changedSince(gists.updatedAt, gists.createdAt)}
      union all
      select ${coursePayments.enrolleeId}, ${coursePayments.createdAt}
      from ${coursePayments} where ${coursePayments.createdAt} >= ${since}
      union all
      select ${accountSubscriptions.accountId}, ${accountSubscriptions.createdAt}
      from ${accountSubscriptions} where ${accountSubscriptions.createdAt} >= ${since}
    ) activity
    where account_id not in ${staffAccountIds}
  `)

  return toPeriodCounts(result.rows[0])
}

export async function readSignUpCounts(starts: PeriodStarts): Promise<PeriodCounts> {
  const [row] = await db
    .select(countsByPeriodFields(sql`count(*)`, accounts.createdAt, starts))
    .from(accounts)
    .where(
      and(
        gte(accounts.createdAt, earliestStart(starts)),
        accountNotDeleted,
        eq(accounts.isAdmin, false),
      ),
    )

  return toPeriodCounts(row)
}

export async function readEnrollmentCounts(starts: PeriodStarts): Promise<PeriodCounts> {
  const [row] = await db
    .select(countsByPeriodFields(sql`count(*)`, courseEnrollments.createdAt, starts))
    .from(courseEnrollments)
    .where(
      and(
        gte(courseEnrollments.createdAt, earliestStart(starts)),
        eq(courseEnrollments.deleted, false),
        notInArray(courseEnrollments.enrolleeId, staffAccountIds),
      ),
    )

  return toPeriodCounts(row)
}

export async function readSubmissionCounts(starts: PeriodStarts): Promise<PeriodCounts> {
  const [row] = await db
    .select(countsByPeriodFields(sql`count(*)`, courseAssignmentSubmissions.createdAt, starts))
    .from(courseAssignmentSubmissions)
    .where(
      and(
        gte(courseAssignmentSubmissions.createdAt, earliestStart(starts)),
        eq(courseAssignmentSubmissions.deleted, false),
        // A draft is a save, not a submission.
        sql`coalesce(${courseAssignmentSubmissions.isDraft}, false) = false`,
        notInArray(courseAssignmentSubmissions.enrolleeId, staffAccountIds),
      ),
    )

  return toPeriodCounts(row)
}

/** Every non-staff subscription, for `toSubscriptionCounts` — there are only a handful. */
export async function readSubscriptionsForMetrics(): Promise<SubscriptionForMetrics[]> {
  return db
    .select({
      createdAt: accountSubscriptions.createdAt,
      updatedAt: accountSubscriptions.updatedAt,
      status: accountSubscriptions.status,
      stripePriceId: accountSubscriptions.stripePriceId,
      currentPeriodEnd: accountSubscriptions.currentPeriodEnd,
      cancelAtPeriodEnd: accountSubscriptions.cancelAtPeriodEnd,
    })
    .from(accountSubscriptions)
    .where(notInArray(accountSubscriptions.accountId, staffAccountIds))
}

/**
 * One page of every account's activity, newest first: the same events as a user's feed, keyed by
 * `(at, sort_key)` so pages never overlap. Every branch takes its own newest `limit` rows off a
 * timestamp index, so the union is bound to hold the page however far back the cursor is.
 */
export async function readSiteActivity(
  cursor: SiteActivityCursor | null,
  limit: number,
  includeAdmins: boolean,
): Promise<{ rows: (UserActivityRow & SiteActivityColumns)[]; cursor: SiteActivityCursor | null }> {
  const cursorAt = cursor && sql`${cursor.at}::timestamp`
  const notDeleted = (column: AnyPgColumn) => sql`coalesce(${column}, false) = false`
  // Postgres can't derive an index bound from a `coalesce`-dated row comparison, so it's explicit.
  const onPage = (key: SQL, indexed: AnyPgColumn, at: SQL | AnyPgColumn = indexed) =>
    cursor
      ? sql`${indexed} <= ${cursorAt} and (${at}, ${key}) < (${cursorAt}, ${cursor.key})`
      : sql`true`
  // Filtered inside each branch, before its limit, so admins' rows can't crowd out the page.
  const byLearner = (accountId: AnyPgColumn) =>
    includeAdmins ? sql`true` : sql`${accountId} not in ${staffAccountIds}`

  const accountKey = sql`'account:' || ${accounts.id}`
  const signInKey = sql`'sign-in:' || ${emailAccountAttempts.id}`
  const googleKey = sql`'google:' || ${googleAccounts.id}`
  const githubKey = sql`'github:' || ${githubAccounts.id}`
  const enrollmentKey = sql`'enrollment:' || ${courseEnrollments.courseId} || ':' || ${courseEnrollments.enrolleeId}`
  const progressKey = sql`'progress:' || ${courseSectionProgress.sectionId} || ':' || ${courseSectionProgress.enrolleeId}`
  const progressAt = sql`coalesce(${courseSectionProgress.updatedAt}, ${courseSectionProgress.createdAt})`
  const submissionKey = sql`'submission:' || ${courseAssignmentSubmissions.id}`
  const evaluationKey = sql`'evaluation:' || ${courseAssignmentSubmissions.id}`
  const notebookKey = sql`'notebook:' || ${gists.id}`
  const notebookAt = sql`coalesce(${gists.updatedAt}, ${gists.createdAt})`
  const paymentKey = sql`'payment:' || ${coursePayments.sessionId}`
  const subscriptionKey = sql`'subscription:' || ${accountSubscriptions.id}`
  const certificateKey = sql`'certificate:' || ${courseCertificates.id}`
  const quizAt = sql`max(${quizQuestionAttempts.createdAt})`
  const quizKey = sql`'quiz:' || min(${quizQuestionAttempts.id})`

  // Progress and notebooks are dated by `coalesce(updated_at, created_at)`, which no index
  // covers: each takes the newest rows off both indexes, and `union` drops the overlap.
  const progress = sql`select 'SECTION_PROGRESS', ${progressAt} as at, ${progressKey} as sort_key,
      ${courseSectionProgress.enrolleeId}, ${courses.slug}, ${courses.title}, ${courseSections.title},
      ${courseSections.slug}, ${courseSections.sectionType}, ${courseSectionProgress.progress}, null
    from ${courseSectionProgress}
    join ${courseSections} on ${courseSections.id} = ${courseSectionProgress.sectionId}
    join ${courses} on ${courses.id} = ${courseSections.courseId}
    where ${notDeleted(courseSectionProgress.deleted)}`
  const notebooks = sql`select 'NOTEBOOK', ${notebookAt} as at, ${notebookKey} as sort_key,
      ${gists.accountId}, null, null, coalesce(${gists.title}, ${gists.slug}), ${gists.slug},
      ${gists.visibility}, null, null
    from ${gists} where ${notDeleted(gists.deleted)}`

  const result = await db.execute<
    UserActivityRow & SiteActivityColumns & { cursor_at: string }
  >(sql`
    with others as (
      (select 'SIGNED_UP'::text as kind, ${accounts.createdAt} as at, ${accountKey} as sort_key,
        ${accounts.id} as account_id, null::text as course_slug, null::text as course_title,
        null::text as subject, null::text as subject_slug, null::text as detail,
        null::bigint as count, null::text as extra
      from ${accounts} where ${onPage(accountKey, accounts.createdAt)} and ${byLearner(accounts.id)}
      order by at desc, sort_key desc limit ${limit})

      union
      (select 'SIGNED_IN', ${emailAccountAttempts.createdAt} as at, ${signInKey} as sort_key,
        ${accounts.id}, null, null, null, null, null, null, null
      from ${emailAccountAttempts}
      join ${accounts} on ${accounts.email} = ${emailAccountAttempts.email}
      where ${emailAccountAttempts.consumed}
        and ${onPage(signInKey, emailAccountAttempts.createdAt)} and ${byLearner(accounts.id)}
      order by at desc, sort_key desc limit ${limit})

      union
      (select 'LINKED_PROVIDER', ${googleAccounts.createdAt} as at, ${googleKey} as sort_key,
        ${googleAccounts.accountId}, null, null, 'Google', null, ${googleAccounts.email}, null, null
      from ${googleAccounts} where ${onPage(googleKey, googleAccounts.createdAt)} and ${byLearner(googleAccounts.accountId)}
      order by at desc, sort_key desc limit ${limit})

      union
      (select 'LINKED_PROVIDER', ${githubAccounts.createdAt} as at, ${githubKey} as sort_key,
        ${githubAccounts.accountId}, null, null, 'GitHub', null, ${githubAccounts.username}, null,
        null
      from ${githubAccounts} where ${onPage(githubKey, githubAccounts.createdAt)} and ${byLearner(githubAccounts.accountId)}
      order by at desc, sort_key desc limit ${limit})

      union
      (select 'ENROLLED', ${courseEnrollments.createdAt} as at, ${enrollmentKey} as sort_key,
        ${courseEnrollments.enrolleeId}, ${courses.slug}, ${courses.title}, null, null,
        ${courseEnrollments.paymentStatus}, null, null
      from ${courseEnrollments}
      join ${courses} on ${courses.id} = ${courseEnrollments.courseId}
      where ${onPage(enrollmentKey, courseEnrollments.createdAt)} and ${byLearner(courseEnrollments.enrolleeId)}
      order by at desc, sort_key desc limit ${limit})

      union
      (${progress}
        and ${courseSectionProgress.updatedAt} is not null
        and ${onPage(progressKey, courseSectionProgress.updatedAt)} and ${byLearner(courseSectionProgress.enrolleeId)}
      order by ${courseSectionProgress.updatedAt} desc, sort_key desc limit ${limit})

      union
      (${progress}
        and ${onPage(progressKey, courseSectionProgress.createdAt, progressAt)} and ${byLearner(courseSectionProgress.enrolleeId)}
      order by ${courseSectionProgress.createdAt} desc, sort_key desc limit ${limit})

      union
      (select 'SUBMITTED', ${courseAssignmentSubmissions.createdAt} as at,
        ${submissionKey} as sort_key, ${courseAssignmentSubmissions.enrolleeId}, ${courses.slug},
        ${courses.title}, ${courseSections.title}, ${courseSections.slug},
        case when ${courseAssignmentSubmissions.isDraft} then 'DRAFT' end, null, null
      from ${courseAssignmentSubmissions}
      join ${courseSections} on ${courseSections.id} = ${courseAssignmentSubmissions.sectionId}
      join ${courses} on ${courses.id} = ${courseSections.courseId}
      where ${notDeleted(courseAssignmentSubmissions.deleted)}
        and ${onPage(submissionKey, courseAssignmentSubmissions.createdAt)} and ${byLearner(courseAssignmentSubmissions.enrolleeId)}
      order by at desc, sort_key desc limit ${limit})

      union
      (select 'EVALUATED', ${courseAssignmentSubmissions.updatedAt} as at,
        ${evaluationKey} as sort_key, ${courseAssignmentSubmissions.enrolleeId}, ${courses.slug},
        ${courses.title}, ${courseSections.title}, ${courseSections.slug},
        ${courseAssignmentSubmissions.assignmentStatus}, null, ${evaluators.name}
      from ${courseAssignmentSubmissions}
      join ${courseSections} on ${courseSections.id} = ${courseAssignmentSubmissions.sectionId}
      join ${courses} on ${courses.id} = ${courseSections.courseId}
      left join ${accounts} as evaluators on ${evaluators.id} = ${courseAssignmentSubmissions.evaluatorId}
      where ${notDeleted(courseAssignmentSubmissions.deleted)}
        and ${courseAssignmentSubmissions.assignmentStatus} in ('PASS', 'FAIL')
        and ${courseAssignmentSubmissions.updatedAt} is not null
        and ${onPage(evaluationKey, courseAssignmentSubmissions.updatedAt)} and ${byLearner(courseAssignmentSubmissions.enrolleeId)}
      order by at desc, sort_key desc limit ${limit})

      union
      (${notebooks}
        and ${gists.updatedAt} is not null
        and ${onPage(notebookKey, gists.updatedAt)} and ${byLearner(gists.accountId)}
      order by ${gists.updatedAt} desc, sort_key desc limit ${limit})

      union
      (${notebooks}
        and ${onPage(notebookKey, gists.createdAt, notebookAt)} and ${byLearner(gists.accountId)}
      order by ${gists.createdAt} desc, sort_key desc limit ${limit})

      union
      (select 'PAYMENT', ${coursePayments.createdAt} as at, ${paymentKey} as sort_key,
        ${coursePayments.enrolleeId}, ${courses.slug}, ${courses.title}, null, null,
        ${coursePayments.paymentStatus}, ${coursePayments.amount}, ${coursePayments.currency}
      from ${coursePayments}
      left join ${courses} on ${courses.id} = ${coursePayments.courseId}
      where ${coursePayments.enrolleeId} is not null
        and ${onPage(paymentKey, coursePayments.createdAt)} and ${byLearner(coursePayments.enrolleeId)}
      order by at desc, sort_key desc limit ${limit})

      union
      (select 'SUBSCRIBED', ${accountSubscriptions.createdAt} as at,
        ${subscriptionKey} as sort_key, ${accountSubscriptions.accountId}, null, null, null, null,
        ${accountSubscriptions.status}, null, null
      from ${accountSubscriptions}
      where ${onPage(subscriptionKey, accountSubscriptions.createdAt)} and ${byLearner(accountSubscriptions.accountId)}
      order by at desc, sort_key desc limit ${limit})

      union
      (select 'CERTIFIED', ${courseCertificates.issuedAt} as at, ${certificateKey} as sort_key,
        ${courseCertificates.ownerId}, ${courses.slug}, ${courses.title}, null,
        ${courseCertificates.slug}, null, null, null
      from ${courseCertificates}
      join ${courses} on ${courses.id} = ${courseCertificates.courseId}
      where ${notDeleted(courseCertificates.deleted)}
        and ${courseCertificates.issuedAt} is not null
        and ${onPage(certificateKey, courseCertificates.issuedAt)} and ${byLearner(courseCertificates.ownerId)}
      order by at desc, sort_key desc limit ${limit})
    ),

    -- Quiz answers roll up per account, quiz and day, which no index can order. Nothing older
    -- than the other events' last row on this page can make it, so only those days are read.
    oldest as (
      select at from others order by at desc, sort_key desc offset ${limit - 1} limit 1
    ),
    quiz as (
      select 'QUIZ', ${quizAt} as at, ${quizKey} as sort_key, ${quizQuestionAttempts.accountId},
        null, null, ${quizzes.displayTitle}, ${quizzes.urlSlug}, null, count(*),
        (count(*) filter (where ${quizQuestionAttempts.isCorrect}))::text
      from ${quizQuestionAttempts}
      join ${quizzes} on ${quizzes.id} = ${quizQuestionAttempts.quizId}
      where ${quizQuestionAttempts.createdAt} >=
          coalesce(date_trunc('day', (select at from oldest)), '-infinity'::timestamp)
        and ${byLearner(quizQuestionAttempts.accountId)}
        ${cursor ? sql`and ${quizQuestionAttempts.createdAt} < date_trunc('day', ${cursorAt}) + interval '1 day'` : sql``}
      group by ${quizQuestionAttempts.accountId}, ${quizzes.id},
        date_trunc('day', ${quizQuestionAttempts.createdAt})
      ${cursor ? sql`having (${quizAt}, ${quizKey}) < (${cursorAt}, ${cursor.key})` : sql``}
    )

    select activity.*, activity.at::text as cursor_at, ${accounts.name} as account_name,
      ${accounts.username} as account_username
    from (select * from others union all select * from quiz) activity
    left join ${accounts} on ${accounts.id} = activity.account_id
    order by activity.at desc, activity.sort_key desc
    limit ${limit}
  `)

  const last = result.rows.at(-1)
  return {
    rows: result.rows,
    cursor:
      last && result.rows.length === limit ? { at: last.cursor_at, key: last.sort_key } : null,
  }
}

type SiteActivityColumns = {
  sort_key: string
  account_id: string | number | null
  account_name: string | null
  account_username: string | null
}

const evaluators = alias(accounts, "evaluators")

/**
 * A raw-SQL bound for a `timestamp without time zone` column, which holds UTC. node-postgres
 * would send a bare `Date` in the server's local zone, and Postgres drops the offset.
 */
function toTimestamp(date: Date): SQL {
  return sql`${date.toISOString()}::timestamp`
}

function earliestStart(starts: PeriodStarts): Date {
  return new Date(Math.min(...METRICS_PERIODS.map((period) => starts[period].getTime())))
}

function countsByPeriodFields(aggregate: SQL, column: AnyPgColumn, starts: PeriodStarts) {
  return Object.fromEntries(
    METRICS_PERIODS.map((period) => [
      period,
      sql<string>`${aggregate} filter (where ${column} >= ${toTimestamp(starts[period])})`,
    ]),
  ) as Record<MetricsPeriod, SQL<string>>
}

function countsByPeriod(aggregate: SQL, column: SQL, starts: PeriodStarts) {
  return sql.join(
    METRICS_PERIODS.map(
      (period) =>
        sql`${aggregate} filter (where ${column} >= ${toTimestamp(starts[period])}) as ${sql.identifier(period)}`,
    ),
    sql`, `,
  )
}

function toPeriodCounts(row: Record<MetricsPeriod, string | number> | undefined) {
  return Object.fromEntries(
    METRICS_PERIODS.map((period) => [period, Number(row?.[period] ?? 0)]),
  ) as PeriodCounts
}

/** Staff test everything on their own accounts, which would skew the metrics. */
const staffAccountIds = db
  .select({ accountId: accounts.id })
  .from(accounts)
  .where(eq(accounts.isAdmin, true))
