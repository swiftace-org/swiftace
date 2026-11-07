import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

const mocks = vi.hoisted(() => ({
  run: vi.fn(),
  middlewares: [] as unknown[],
  remove: vi.fn(),
  clearCookie: vi.fn(),
}))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    middleware: (middlewares: unknown[]) => {
      mocks.middlewares = middlewares
      return {
        validator: () => ({
          handler: (handler: (...args: never[]) => unknown) => {
            mocks.run.mockImplementation(handler)
            return mocks.run
          },
        }),
      }
    },
  }),
}))
vi.mock("@/lib/utils", () => ({ authMiddleware: "authenticated-only" }))
vi.mock("@/lib/utils.server", () => ({ clearAuthCookie: mocks.clearCookie }))
vi.mock("../../../(manage)/manage/users/$userId/-lib/utils.server", () => ({
  deleteUserAccount: mocks.remove,
}))
await import("./submit-delete-account")
const account = { id: 42, email: "Learner@example.com" }
beforeEach(() => {
  mocks.remove.mockReset().mockResolvedValue({ emailSent: true })
  mocks.clearCookie.mockClear()
})
describe("settings account deletion", () => {
  it("requires authentication", () => {
    expect(mocks.middlewares).toEqual(["authenticated-only"])
  })
  it.each(["", "other@example.com", null, 42])(
    "rejects invalid confirmation %s before deletion",
    async (confirmation) => {
      expect(await mocks.run({ data: { confirmation }, context: { account } })).toHaveProperty(
        "error",
      )
      expect(mocks.remove).not.toHaveBeenCalled()
      expect(mocks.clearCookie).not.toHaveBeenCalled()
    },
  )
  it("uses the session account even if a caller supplies someone else's id", async () => {
    await mocks.run({
      data: { confirmation: " learner@example.com ", userId: 99 },
      context: { account },
    })
    expect(mocks.remove).toHaveBeenCalledWith({
      account,
      currentAccountId: 42,
      sendEmail: true,
      selfService: true,
    })
    expect(mocks.clearCookie).toHaveBeenCalledOnce()
  })
  it("keeps the session if deletion is blocked", async () => {
    mocks.remove.mockResolvedValue({ error: "Active subscription" })
    expect(
      await mocks.run({ data: { confirmation: account.email }, context: { account } }),
    ).toEqual({ error: "Active subscription" })
    expect(mocks.clearCookie).not.toHaveBeenCalled()
  })
  it("signs out even if the confirmation email failed", async () => {
    mocks.remove.mockResolvedValue({ emailSent: false })
    await mocks.run({ data: { confirmation: account.email }, context: { account } })
    expect(mocks.clearCookie).toHaveBeenCalledOnce()
  })
})
