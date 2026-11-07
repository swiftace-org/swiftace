// Overlapping sign-in requests against a real Postgres, since the guarantees under test are the
// database's. Runs when TEST_DATABASE_URL names a database it may write to, which
// test/database-setup.ts migrates (CI's).
import { randomUUID } from "node:crypto"

import { afterAll, beforeAll, describe, expect, it, vi } from "vite-plus/test"

const DATABASE_URL = process.env.TEST_DATABASE_URL
if (DATABASE_URL) {
  Object.assign(process.env, {
    DATABASE_URL,
    JWT_SECRET_KEY: "test",
    HASH_SECRET_KEY: "test",
    AWS_ACCESS_KEY_ID: "test",
    AWS_ACCESS_KEY_SECRET: "test",
    AWS_REGION: "us-east-1",
    EMAIL_DOMAIN: "example.com",
    R2_ENDPOINT_URL: "http://127.0.0.1:9",
    R2_ACCESS_KEY_ID: "test",
    R2_SECRET_ACCESS_KEY: "test",
    R2_BUCKET: "test",
    NOTEBOOK_PREVIEW_URL: "http://127.0.0.1:9",
  })
}

const mocks = vi.hoisted(() => ({
  handlers: {} as Record<string, (input: { data: unknown }) => Promise<unknown>>,
  setAuthCookie: vi.fn(),
  // Called once per code compared, so it counts the guesses that got that far.
  hashString: vi.fn((value: string) => `hashed:${value}`),
}))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    validator: () => ({
      handler: (handler: (input: { data: unknown }) => Promise<unknown>) => {
        mocks.handlers[Object.keys(mocks.handlers).length ? "magicLink" : "code"] = handler
        return handler
      },
    }),
  }),
}))
vi.mock("../../-lib/utils.server", () => ({
  validateTurnstileToken: async () => ({ success: true }),
  hashString: mocks.hashString,
  findOrCreateAccountByEmail: async () => ({ account: { id: 1 }, isNewAccount: false }),
  setAuthCookie: mocks.setAuthCookie,
  captureLogin: () => {},
}))

const CODE = "123456"
const MAX_GUESSES = 5

// CI always runs it, so a missing database fails there rather than skipping quietly.
describe.skipIf(!DATABASE_URL && !process.env.CI)(
  "signing in with an emailed code, with requests overlapping",
  () => {
    let schema: typeof import("@/lib/schema.server")

    beforeAll(async () => {
      schema = await import("@/lib/schema.server")
      await import("./verify-email-code")
      await import("./verify-magic-link-token")
    })
    afterAll(async () => {
      await (globalThis as unknown as { __appDbPool?: { end(): Promise<void> } }).__appDbPool?.end()
    })

    /** A fresh attempt, as the login form makes one, with its state token and link token. */
    async function newAttempt() {
      const state = randomUUID()
      const link = randomUUID()
      const [attempt] = await schema.db
        .insert(schema.emailAccountAttempts)
        .values({
          email: "learner@example.com",
          codeHash: `hashed:${CODE}`,
          tokenHash: `hashed:${link}`,
          stateToken: state,
          consumed: false,
        })
        .returning({ id: schema.emailAccountAttempts.id })
      return { id: attempt!.id, state, link }
    }

    const verify = (state: string, otp: string) =>
      mocks.handlers.code!({ data: { state, otp, turnstileToken: "" } }) as Promise<{
        success?: true
        error?: string
      }>

    it("compares only the allowed number of guesses, however many arrive at once", async () => {
      const { id, state } = await newAttempt()
      mocks.setAuthCookie.mockClear()
      mocks.hashString.mockClear()
      // Twenty wrong guesses and the right code, all in flight together.
      const guesses = [...Array.from({ length: 20 }, (_, i) => String(i).padStart(6, "0")), CODE]
      const results = await Promise.all(guesses.map((otp) => verify(state, otp)))

      expect(mocks.hashString.mock.calls.length).toBeGreaterThan(0)
      expect(mocks.hashString.mock.calls.length).toBeLessThanOrEqual(MAX_GUESSES)
      expect(results.every((result) => result.success || result.error)).toBe(true)
      const [row] = await schema.db
        .select({
          guesses: schema.emailAccountAttempts.failedAttempts,
          consumed: schema.emailAccountAttempts.consumed,
        })
        .from(schema.emailAccountAttempts)
        .where((await import("drizzle-orm")).eq(schema.emailAccountAttempts.id, id))
      expect(row!.guesses).toBeLessThanOrEqual(MAX_GUESSES)
      expect(row!.consumed).toBe(true)
      // Whether the right code was among those compared is luck; what matters is the cap.
      expect(mocks.setAuthCookie.mock.calls.length).toBeLessThanOrEqual(1)
      expect((await verify(state, CODE)).success).toBeUndefined()
    })

    it("signs in once when the right code arrives several times at once", async () => {
      const { state } = await newAttempt()
      mocks.setAuthCookie.mockClear()
      const results = await Promise.all(Array.from({ length: 4 }, () => verify(state, CODE)))
      expect(results.filter((result) => result.success)).toHaveLength(1)
      expect(mocks.setAuthCookie).toHaveBeenCalledOnce()
    })

    it("signs in once when the link and the code are used at once", async () => {
      const { state, link } = await newAttempt()
      mocks.setAuthCookie.mockClear()
      const results = (await Promise.all([
        mocks.handlers.magicLink!({ data: { token: link } }),
        mocks.handlers.magicLink!({ data: { token: link } }),
        verify(state, CODE),
      ])) as { success?: true }[]
      expect(results.filter((result) => result.success)).toHaveLength(1)
      expect(mocks.setAuthCookie).toHaveBeenCalledOnce()
    })

    it("still lets a wrong guess be followed by the right one", async () => {
      const { state } = await newAttempt()
      expect(await verify(state, "000000")).toEqual({
        error: "Invalid verification code. Please try again.",
      })
      expect(await verify(state, CODE)).toEqual({ success: true })
    })
  },
)
