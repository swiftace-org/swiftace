import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import type { SubscriptionInterval } from "@/types/subscription"

const mocks = vi.hoisted(() => ({
  run: vi.fn<
    (args: {
      data: { interval: SubscriptionInterval; courseSlug?: string }
      context: { account: { id: number; email: string } }
    }) => Promise<{ url: string } | { error: string }>
  >(),
  createCheckout: vi.fn(),
  readHasActiveSubscription: vi.fn(),
  readLatestSubscription: vi.fn(),
  getSiteConfig: vi.fn(),
}))

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    middleware: () => ({
      validator: () => ({
        handler: (handler: Parameters<typeof mocks.run.mockImplementation>[0]) => {
          mocks.run.mockImplementation(handler)
          return mocks.run
        },
      }),
    }),
  }),
}))
vi.mock("@/lib/utils", () => ({ authMiddleware: {}, integrationMiddleware: () => ({}) }))
vi.mock("@/lib/utils.server", () => ({
  captureEvent: () => {},
  getSiteConfig: mocks.getSiteConfig,
  getSiteUrl: () => "https://academy.example",
  readHasActiveSubscription: mocks.readHasActiveSubscription,
}))
vi.mock("../../-lib/db.server", () => ({
  readLatestSubscriptionByAccountId: mocks.readLatestSubscription,
}))
vi.mock("../../-lib/utils.server", () => ({
  getStripeClient: () => ({ checkout: { sessions: { create: mocks.createCheckout } } }),
  readPriceIdForInterval: (interval: SubscriptionInterval) => `price_${interval}`,
}))

await import("./submit-checkout-session")

const account = { id: 42, email: "learner@example.com" }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.readHasActiveSubscription.mockResolvedValue(false)
  mocks.readLatestSubscription.mockResolvedValue(null)
  mocks.getSiteConfig.mockResolvedValue({ pricing: { trialEnabled: true, trialDays: 7 } })
  mocks.createCheckout.mockResolvedValue({ url: "https://checkout.stripe.com/test-session" })
})

describe("subscription trial checkout", () => {
  it("rejects an invalid plan before creating a checkout", async () => {
    const result = await mocks.run({
      data: { interval: "invalid" as SubscriptionInterval },
      context: { account },
    })

    expect(result).toEqual({ error: "Choose a monthly or yearly plan." })
    expect(mocks.createCheckout).not.toHaveBeenCalled()
    expect(mocks.readHasActiveSubscription).not.toHaveBeenCalled()
  })

  it.each(["month", "year"] as const)(
    "gives a first-time %s subscriber seven days before charging",
    async (interval) => {
      const result = await mocks.run({
        data: { interval, courseSlug: "python" },
        context: { account },
      })

      expect(result).toEqual({ url: "https://checkout.stripe.com/test-session" })
      expect(mocks.createCheckout).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "subscription",
          line_items: [{ price: `price_${interval}`, quantity: 1 }],
          customer_email: account.email,
          payment_method_collection: "always",
          allowed_payment_method_types: ["card"],
          subscription_data: {
            metadata: { accountId: "42", courseSlug: "python" },
            trial_period_days: 7,
            trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
          },
          cancel_url: "https://academy.example/course/python",
          success_url: "https://academy.example/pricing/complete?session_id={CHECKOUT_SESSION_ID}",
        }),
      )
    },
  )

  it.each(["canceled", "past_due", "incomplete_expired"])(
    "does not offer a second trial after a %s subscription",
    async (status) => {
      mocks.readLatestSubscription.mockResolvedValue({ stripeCustomerId: "cus_returning", status })

      await mocks.run({ data: { interval: "year" }, context: { account } })

      expect(mocks.createCheckout).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: "cus_returning",
          subscription_data: { metadata: { accountId: "42" } },
          cancel_url: "https://academy.example/pricing",
        }),
      )
    },
  )

  it("goes straight to a paid subscription while the trial is switched off", async () => {
    mocks.getSiteConfig.mockResolvedValue({ pricing: { trialEnabled: false, trialDays: 7 } })

    await mocks.run({ data: { interval: "month" }, context: { account } })

    expect(mocks.createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_email: account.email,
        subscription_data: { metadata: { accountId: "42" } },
      }),
    )
  })

  it("gives the trial length set in the config", async () => {
    mocks.getSiteConfig.mockResolvedValue({ pricing: { trialEnabled: true, trialDays: 14 } })

    await mocks.run({ data: { interval: "year" }, context: { account } })

    expect(mocks.createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription_data: expect.objectContaining({ trial_period_days: 14 }),
      }),
    )
  })

  it("prevents a subscriber with active or trialing access from opening another checkout", async () => {
    mocks.readHasActiveSubscription.mockResolvedValue(true)

    const result = await mocks.run({ data: { interval: "month" }, context: { account } })

    expect(result).toEqual({ error: "You already have an active subscription." })
    expect(mocks.createCheckout).not.toHaveBeenCalled()
  })
})
