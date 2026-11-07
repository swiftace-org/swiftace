import { DatabaseError } from "pg"

import AccountDeletedEmail from "@/emails/account-deleted-email"
import { runInTransaction } from "@/lib/schema.server"
import { slugify } from "@/lib/utils"
import {
  captureServerException,
  deleteStorageObjects,
  getSiteConfig,
  readEmailBrand,
  sendSesEmail,
} from "@/lib/utils.server"
import type { Account } from "@/types/account"
import type { UserDeletionCounts, UserDeletionPreview } from "@/types/user"

import {
  getCertificateDownloadUrl,
  deleteCertificateAssets,
} from "../../../../../certificate/-lib/utils.server"
import { USER_DELETION_TERMINAL_SUBSCRIPTION_STATUSES } from "./constants"
import {
  clearCoursePaymentEnrollee,
  clearOriginalSubmissionLinks,
  clearQuestionCreator,
  clearSubmissionEvaluator,
  deleteAccount,
  deleteUserCertificates,
  deleteUserEnrollments,
  deleteUserGithubAccounts,
  deleteUserGoogleAccounts,
  deleteUserIntegrations,
  deleteUserLoginAttempts,
  deleteUserNotebooks,
  deleteUserQuizAnswers,
  deleteUserSectionProgress,
  deleteUserSubmissions,
  deleteUserSubscriptions,
  readUserCertificates,
  readUserDeletionCounts,
  readUserNotebookSlugs,
  readUserSubscriptionStatuses,
} from "./db.server"

/**
 * Deleting the account would orphan a course or leave Stripe billing nobody, so those are
 * settled by hand first. Checked when the dialog opens and again on the delete itself.
 */
export function toUserDeletionBlockers({
  accountId,
  currentAccountId,
  counts,
  subscriptionStatuses,
  selfService = false,
}: {
  accountId: number
  currentAccountId: number
  counts: UserDeletionCounts
  subscriptionStatuses: string[]
  selfService?: boolean
}): string[] {
  const blockers: string[] = []
  if (!selfService && accountId === currentAccountId)
    blockers.push("You can't delete your own account.")
  if (counts.ownedCourses) {
    blockers.push(
      `${selfService ? "You" : "They"} own ${counts.ownedCourses} ${counts.ownedCourses === 1 ? "course" : "courses"}. Transfer ${counts.ownedCourses === 1 ? "it" : "them"} to another account first.`,
    )
  }
  if (
    subscriptionStatuses.some(
      (status) => !USER_DELETION_TERMINAL_SUBSCRIPTION_STATUSES.includes(status),
    )
  ) {
    blockers.push(
      selfService
        ? "You have a subscription that has not ended. Use Manage billing to cancel it, then wait for it to end before deleting your account. Contact support if you need help."
        : "They have a subscription that has not ended. Cancel it in Stripe before deleting the account.",
    )
  }
  return blockers
}

/** The legacy app's layout for notebook files, which nothing in this app writes any more. */
export async function deleteNotebookFiles(slugs: string[]): Promise<void> {
  await deleteStorageObjects(slugs.filter(Boolean).map((slug) => `notebooks/${slug}.ipynb`))
}

export async function sendAccountDeletedEmail(
  account: Account,
): Promise<{ success: true } | { success: false; error: unknown }> {
  const { general } = await getSiteConfig()
  return sendSesEmail({
    to: account.email,
    cc: [general.supportEmail],
    subject: `Your ${general.siteName} account has been deleted`,
    reactBody: AccountDeletedEmail({
      brand: await readEmailBrand(),
      recipientName: account.name || account.username,
      email: account.email,
    }),
  })
}

/** Shared by admin deletion and account settings; files are removed only after the commit. */
export async function deleteUserAccount({
  account,
  currentAccountId,
  sendEmail,
  selfService = false,
}: {
  account: Account
  currentAccountId: number
  sendEmail: boolean
  selfService?: boolean
}): Promise<{ emailSent: boolean } | { error: string }> {
  const [counts, subscriptionStatuses, certificates, notebookSlugs] = await Promise.all([
    readUserDeletionCounts(account.id, account.email),
    readUserSubscriptionStatuses(account.id),
    readUserCertificates(account.id),
    readUserNotebookSlugs(account.id),
  ])
  const [blocker] = toUserDeletionBlockers({
    accountId: account.id,
    currentAccountId,
    selfService,
    counts,
    subscriptionStatuses,
  })
  if (blocker) return { error: blocker }

  try {
    await runInTransaction(async (tx) => {
      await clearOriginalSubmissionLinks(account.id, tx)
      await clearSubmissionEvaluator(account.id, tx)
      await clearQuestionCreator(account.id, tx)
      await clearCoursePaymentEnrollee(account.id, tx)
      await deleteUserQuizAnswers(account.id, tx)
      await deleteUserSectionProgress(account.id, tx)
      await deleteUserSubmissions(account.id, tx)
      await deleteUserCertificates(account.id, tx)
      await deleteUserEnrollments(account.id, tx)
      await deleteUserSubscriptions(account.id, tx)
      await deleteUserNotebooks(account.id, tx)
      await deleteUserIntegrations(account.id, tx)
      await deleteUserGithubAccounts(account.id, tx)
      await deleteUserGoogleAccounts(account.id, tx)
      await deleteUserLoginAttempts(account.email, tx)
      await deleteAccount(account.id, tx)
    })
  } catch (error) {
    console.error("deleteUserAccount: failed to delete account", account.id, error)
    // A table this app doesn't model still points at the account. Drizzle puts pg's error on `cause`.
    const cause = error instanceof Error ? error.cause : undefined
    if (cause instanceof DatabaseError && cause.code === "23503") {
      return {
        error:
          "Other records still reference this account. Nothing was changed. Please contact support.",
      }
    }
    return { error: "Couldn't delete this account. Nothing was changed — please try again." }
  }

  // The account is gone either way, so leftover files are logged rather than reported.
  await Promise.all([
    deleteCertificateAssets(certificates.map((certificate) => certificate.slug)),
    deleteNotebookFiles(notebookSlugs),
  ]).catch((error) => {
    console.error("deleteUserAccount: failed to delete files", account.id, error)
    captureServerException(error, { accountId: account.id })
  })

  if (!sendEmail) return { emailSent: false }
  try {
    const email = await sendAccountDeletedEmail(account)
    return { emailSent: email.success }
  } catch (error) {
    captureServerException(error, { accountId: account.id })
    return { emailSent: false }
  }
}

export async function readUserDeletionPreview(
  account: Account,
  currentAccountId: number,
  selfService = false,
): Promise<UserDeletionPreview> {
  const [counts, subscriptionStatuses, certificates] = await Promise.all([
    readUserDeletionCounts(account.id, account.email),
    readUserSubscriptionStatuses(account.id),
    readUserCertificates(account.id),
  ])

  const issued = certificates.flatMap(({ issuedAt, deleted, ...certificate }) =>
    issuedAt && !deleted ? [{ ...certificate, issuedAt }] : [],
  )
  return {
    counts,
    blockers: toUserDeletionBlockers({
      accountId: account.id,
      currentAccountId,
      selfService,
      counts,
      subscriptionStatuses,
    }),
    certificates: await Promise.all(
      issued.map(async (certificate) => ({
        slug: certificate.slug,
        courseTitle: certificate.courseTitle,
        issuedAt: certificate.issuedAt,
        downloadUrl: await getCertificateDownloadUrl(
          certificate.slug,
          `${slugify(`${account.name} ${certificate.courseTitle}`)}-certificate.pdf`,
        ),
      })),
    ),
  }
}
