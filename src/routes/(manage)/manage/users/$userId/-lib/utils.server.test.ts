import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import type { Account } from "@/types/account"
import type { UserDeletionCounts } from "@/types/user"

const mocks = vi.hoisted(() => ({
  counts: vi.fn(),
  subscription: vi.fn(),
  certificates: vi.fn(),
  notebooks: vi.fn(),
  transaction: vi.fn(),
  write: vi.fn(),
  files: vi.fn(),
  certificateFiles: vi.fn(),
  email: vi.fn(),
}))
vi.mock("@/lib/utils", () => ({ slugify: (value: string) => value }))
vi.mock("@/lib/schema.server", () => ({ runInTransaction: mocks.transaction }))
vi.mock("@/lib/utils.server", () => ({
  captureServerException: vi.fn(),
  deleteR2Objects: mocks.files,
  getSiteConfig: async () => ({
    general: { siteName: "Academy", supportEmail: "support@example.com" },
  }),
  readEmailBrand: async () => ({ siteName: "Academy", logoUrl: "https://example.com/logo.svg" }),
  sendSesEmail: mocks.email,
}))
vi.mock("../../../../../certificate/-lib/utils.server", () => ({
  deleteCertificateAssets: mocks.certificateFiles,
  getCertificateDownloadUrl: vi.fn(),
}))
vi.mock("./db.server", () => ({
  readUserDeletionCounts: mocks.counts,
  readUserSubscriptionStatuses: mocks.subscription,
  readUserCertificates: mocks.certificates,
  readUserNotebookSlugs: mocks.notebooks,
  ...Object.fromEntries(
    [
      "clearOriginalSubmissionLinks",
      "clearSubmissionEvaluator",
      "clearQuestionCreator",
      "clearCoursePaymentEnrollee",
      "deleteUserQuizAnswers",
      "deleteUserSectionProgress",
      "deleteUserSubmissions",
      "deleteUserCertificates",
      "deleteUserEnrollments",
      "deleteUserSubscriptions",
      "deleteUserNotebooks",
      "deleteUserIntegrations",
      "deleteUserGithubAccounts",
      "deleteUserGoogleAccounts",
      "deleteUserLoginAttempts",
      "deleteAccount",
    ].map((name) => [name, mocks.write]),
  ),
}))
const { deleteUserAccount, readUserDeletionPreview, toUserDeletionBlockers } =
  await import("./utils.server")
const account: Account = {
  id: 42,
  email: "learner@example.com",
  name: "Learner",
  username: "learner",
  isAdmin: false,
  flaggedAsSpammer: false,
  createdAt: new Date(),
}
const counts = { ownedCourses: 0 } as UserDeletionCounts
const request = { account, currentAccountId: account.id, sendEmail: true, selfService: true }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.counts.mockResolvedValue(counts)
  mocks.subscription.mockResolvedValue([])
  mocks.certificates.mockResolvedValue([{ slug: "certificate" }])
  mocks.notebooks.mockResolvedValue(["notebook"])
  mocks.transaction.mockImplementation(async (work) => work("tx"))
  mocks.files.mockResolvedValue(undefined)
  mocks.certificateFiles.mockResolvedValue(undefined)
  mocks.email.mockResolvedValue({ success: true })
})

describe("shared account deletion", () => {
  it("keeps the admin self-delete guard while allowing settings self-deletion", () => {
    const input = { accountId: 42, currentAccountId: 42, counts, subscriptionStatuses: [] }
    expect(toUserDeletionBlockers(input)).toEqual(["You can't delete your own account."])
    expect(toUserDeletionBlockers({ ...input, selfService: true })).toEqual([])
  })

  it.each(["subscription", "courses"])(
    "rechecks %s blockers before any writes",
    async (blocker) => {
      if (blocker === "subscription") mocks.subscription.mockResolvedValue(["past_due"])
      else mocks.counts.mockResolvedValue({ ...counts, ownedCourses: 1 })
      expect(await deleteUserAccount(request)).toHaveProperty("error")
      expect(mocks.transaction).not.toHaveBeenCalled()
      expect(mocks.email).not.toHaveBeenCalled()
    },
  )

  it.each(["active", "trialing", "past_due", "unpaid", "paused", "incomplete", "unknown"])(
    "blocks %s in preview and submission without touching account data",
    async (status) => {
      mocks.subscription.mockResolvedValue(["canceled", status, "incomplete_expired"])
      mocks.certificates.mockResolvedValue([])
      expect((await readUserDeletionPreview(account, account.id, true)).blockers).toEqual([
        expect.stringContaining("subscription that has not ended"),
      ])
      // The deletion must re-read statuses rather than trust the earlier preview.
      mocks.subscription.mockClear()
      expect(await deleteUserAccount(request)).toEqual({
        error: expect.stringContaining("subscription that has not ended"),
      })
      expect(mocks.subscription).toHaveBeenCalledWith(account.id)
      expect(mocks.transaction).not.toHaveBeenCalled()
      expect(mocks.write).not.toHaveBeenCalled()
      expect(mocks.files).not.toHaveBeenCalled()
      expect(mocks.email).not.toHaveBeenCalled()
    },
  )

  it("blocks an admin from deleting another user with payment retries", async () => {
    mocks.subscription.mockResolvedValue(["past_due"])
    expect(
      await deleteUserAccount({ ...request, currentAccountId: 99, selfService: false }),
    ).toEqual({ error: expect.stringContaining("subscription that has not ended") })
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it.each([[[]], [["canceled"]], [["incomplete_expired"]], [["canceled", "incomplete_expired"]]])(
    "allows deletion with only terminal subscription history: %j",
    async (statuses) => {
      mocks.subscription.mockResolvedValue(statuses)
      expect(await deleteUserAccount(request)).toEqual({ emailSent: true })
      expect(mocks.transaction).toHaveBeenCalledOnce()
    },
  )

  it("rechecks a past-due subscription that appeared after a clear preview", async () => {
    mocks.certificates.mockResolvedValue([])
    mocks.subscription.mockResolvedValueOnce(["canceled"]).mockResolvedValueOnce(["past_due"])
    expect((await readUserDeletionPreview(account, account.id, true)).blockers).toEqual([])
    expect(await deleteUserAccount(request)).toHaveProperty("error")
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it("deletes transactionally, then cleans files and emails the user with support in cc", async () => {
    expect(await deleteUserAccount(request)).toEqual({ emailSent: true })
    expect(mocks.write).toHaveBeenCalledTimes(16)
    expect(mocks.write).toHaveBeenCalledWith(42, "tx")
    expect(mocks.files).toHaveBeenCalledWith(["notebooks/notebook.ipynb"])
    expect(mocks.certificateFiles).toHaveBeenCalledWith(["certificate"])
    expect(mocks.email).toHaveBeenCalledWith(
      expect.objectContaining({ to: account.email, cc: ["support@example.com"] }),
    )
    expect(mocks.files.mock.invocationCallOrder[0]).toBeGreaterThan(
      mocks.write.mock.invocationCallOrder.at(-1)!,
    )
  })

  it("leaves files and email untouched when the database transaction fails", async () => {
    mocks.transaction.mockRejectedValue(new Error("rollback"))
    expect(await deleteUserAccount(request)).toHaveProperty("error")
    expect(mocks.files).not.toHaveBeenCalled()
    expect(mocks.certificateFiles).not.toHaveBeenCalled()
    expect(mocks.email).not.toHaveBeenCalled()
  })

  it("reports email failure as a completed deletion", async () => {
    mocks.email.mockRejectedValue(new Error("email unavailable"))
    expect(await deleteUserAccount(request)).toEqual({ emailSent: false })
  })

  it("continues to email if file cleanup fails after the commit", async () => {
    mocks.files.mockRejectedValue(new Error("storage unavailable"))
    expect(await deleteUserAccount(request)).toEqual({ emailSent: true })
    expect(mocks.email).toHaveBeenCalled()
  })
})
