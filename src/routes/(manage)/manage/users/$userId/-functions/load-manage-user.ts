import { createServerFn } from "@tanstack/react-start"

import {
  readAccountById,
  readActiveSubscriptionByAccountId,
  readCourseSectionCounts,
} from "@/lib/db.server"
import { adminMiddleware } from "@/lib/utils"
import type { ManagedUserOverview, ManagedUserPayment } from "@/types/user"

import { USER_ACTIVITY_LIMIT, USER_NOTEBOOKS_LIMIT } from "../-lib/constants"
import {
  readAccountSignInMethods,
  readUserActivity,
  readUserCoursePayments,
  readUserEnrollments,
  readUserEvaluationsGivenCount,
  readUserNotebooks,
  readUserNotebooksCount,
  readUserQuizSummaries,
  readUserSectionCompletionCounts,
  readUserSubmissions,
  readUserSubscriptions,
} from "../-lib/db.server"

/**
 * Everything an admin needs to see about one account. Each query is an index lookup on the
 * account, so they all run at once; only the section totals wait, for the course ids.
 */
export const loadManageUser = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .validator((data: { userId: number }) => data)
  .handler(async ({ data }): Promise<ManagedUserOverview | null> => {
    const account = Number.isSafeInteger(data.userId) ? await readAccountById(data.userId) : null
    if (!account) return null

    const [
      signInMethods,
      activeSubscription,
      enrollmentRows,
      completions,
      submissions,
      coursePayments,
      subscriptions,
      quizzes,
      notebooks,
      totalNotebooks,
      activity,
      evaluationsGiven,
    ] = await Promise.all([
      readAccountSignInMethods(account.id),
      readActiveSubscriptionByAccountId(account.id),
      readUserEnrollments(account.id),
      readUserSectionCompletionCounts(account.id),
      readUserSubmissions(account.id),
      readUserCoursePayments(account.id),
      readUserSubscriptions(account.id),
      readUserQuizSummaries(account.id),
      readUserNotebooks(account.id, USER_NOTEBOOKS_LIMIT),
      readUserNotebooksCount(account.id),
      readUserActivity(account, USER_ACTIVITY_LIMIT),
      readUserEvaluationsGivenCount(account.id),
    ])

    const courseIds = enrollmentRows.map((enrollment) => enrollment.courseId)
    const [totalLessons, totalAssignments] = await Promise.all([
      readCourseSectionCounts(courseIds, "LESSON"),
      readCourseSectionCounts(courseIds, "ASSIGNMENT"),
    ])
    const completed = new Map(
      completions.map((row) => [`${row.courseId}:${row.sectionType}`, row.completed]),
    )

    const payments: ManagedUserPayment[] = [
      ...coursePayments.map((payment) => ({
        kind: "course" as const,
        description: payment.courseTitle ?? "Unknown course",
        courseSlug: payment.courseSlug,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        createdAt: payment.createdAt,
        stripeId: payment.paymentIntentId,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      })),
      ...subscriptions.map((subscription) => ({
        kind: "subscription" as const,
        description: "Pro subscription",
        courseSlug: null,
        amount: null,
        currency: null,
        status: subscription.status,
        createdAt: subscription.createdAt,
        stripeId: subscription.stripeSubscriptionId,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return {
      profile: {
        ...account,
        signInMethods,
        activeSubscription: activeSubscription && {
          status: activeSubscription.status,
          currentPeriodEnd: activeSubscription.currentPeriodEnd,
        },
      },
      enrollments: enrollmentRows.map(({ courseId, ...enrollment }) => ({
        ...enrollment,
        completedLessons: completed.get(`${courseId}:LESSON`) ?? 0,
        totalLessons: totalLessons.get(courseId) ?? 0,
        completedAssignments: completed.get(`${courseId}:ASSIGNMENT`) ?? 0,
        totalAssignments: totalAssignments.get(courseId) ?? 0,
      })),
      submissions,
      payments,
      quizzes,
      notebooks,
      totalNotebooks,
      activity,
      evaluationsGiven,
    }
  })
