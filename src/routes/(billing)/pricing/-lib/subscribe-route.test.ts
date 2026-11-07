import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

const mocks = vi.hoisted(() => ({ submitCheckoutSession: vi.fn() }))

vi.mock("../-functions/submit-checkout-session", () => ({
  submitCheckoutSession: mocks.submitCheckoutSession,
}))
vi.mock("@/components/navbar", () => ({ Navbar: () => null }))
vi.mock("@/components/ui/button", () => ({ Button: () => null }))
vi.mock("@/components/ui/skeleton", () => ({ Skeleton: () => null }))
vi.mock("@/lib/config", () => ({
  ROBOTS_NOINDEX_META: { name: "robots", content: "noindex, follow" },
}))
vi.mock("@/lib/utils", () => ({
  toSubmitErrorMessage: (_error: unknown, fallback: string) => fallback,
}))

const { Route } = await import("../subscribe")
const { validateSearch, beforeLoad, loader } = Route.options
if (
  typeof validateSearch !== "function" ||
  typeof beforeLoad !== "function" ||
  typeof loader !== "function"
) {
  throw new Error("The subscribe route must validate, guard, and load checkout.")
}

beforeEach(() => {
  mocks.submitCheckoutSession.mockReset()
  mocks.submitCheckoutSession.mockResolvedValue({ url: "https://checkout.stripe.com/test-session" })
})

describe("subscribe route", () => {
  it.each(["month", "year"] as const)("preserves the %s plan and course through login", (plan) => {
    const search = validateSearch({ plan, courseSlug: "python" })
    expect(search).toEqual({ plan, courseSlug: "python" })
    const href = `/pricing/subscribe?plan=${plan}&courseSlug=python`

    let result
    try {
      beforeLoad({
        search,
        context: { account: null, hasActiveSubscription: false },
        location: { href },
      } as Parameters<typeof beforeLoad>[0])
    } catch (error) {
      result = error
    }

    expect(result).toMatchObject({ options: { to: "/login", search: { next: href } } })
    expect(mocks.submitCheckoutSession).not.toHaveBeenCalled()
  })

  it.each([undefined, "free", "invalid", ["month", "year"]])(
    "rejects the invalid plan %j",
    (plan) => {
      const search = validateSearch({ plan, courseSlug: "python" })
      expect(search).toEqual({ plan: undefined, courseSlug: "python" })
      let result
      try {
        beforeLoad({ search } as Parameters<typeof beforeLoad>[0])
      } catch (error) {
        result = error
      }
      expect(result).toMatchObject({
        options: { to: "/pricing", search: { courseSlug: "python" } },
      })
      expect(mocks.submitCheckoutSession).not.toHaveBeenCalled()
    },
  )

  it("sends an existing subscriber to subscription settings", () => {
    let result
    try {
      beforeLoad({
        search: { plan: "year" },
        context: { account: { id: 42 }, hasActiveSubscription: true },
      } as Parameters<typeof beforeLoad>[0])
    } catch (error) {
      result = error
    }
    expect(result).toMatchObject({ options: { to: "/settings" } })
    expect(mocks.submitCheckoutSession).not.toHaveBeenCalled()
  })

  it.each(["month", "year"] as const)(
    "opens the selected %s checkout after login",
    async (plan) => {
      const context = beforeLoad({
        search: { plan, courseSlug: "python" },
        context: { account: { id: 42 }, hasActiveSubscription: false },
      } as Parameters<typeof beforeLoad>[0])

      await expect(
        loader({
          context,
          deps: { plan, courseSlug: "python" },
          preload: false,
        } as Parameters<typeof loader>[0]),
      ).rejects.toMatchObject({
        options: { href: "https://checkout.stripe.com/test-session", reloadDocument: true },
      })
      expect(mocks.submitCheckoutSession).toHaveBeenCalledExactlyOnceWith({
        data: { interval: plan, courseSlug: "python" },
      })
    },
  )

  it("does not create a checkout during preloading", async () => {
    await loader({ preload: true } as Parameters<typeof loader>[0])
    expect(mocks.submitCheckoutSession).not.toHaveBeenCalled()
  })

  it("returns a checkout error so the page can offer a retry", async () => {
    mocks.submitCheckoutSession.mockResolvedValue({ error: "Checkout is unavailable." })
    await expect(
      loader({
        context: { checkoutPlan: "year" },
        deps: { plan: "year" },
        preload: false,
      } as Parameters<typeof loader>[0]),
    ).resolves.toEqual({ error: "Checkout is unavailable." })
  })

  it("handles a failed request without leaving the page stuck loading", async () => {
    mocks.submitCheckoutSession.mockRejectedValue(new Error("Network failure"))
    await expect(
      loader({
        context: { checkoutPlan: "month" },
        deps: { plan: "month" },
        preload: false,
      } as Parameters<typeof loader>[0]),
    ).resolves.toEqual({ error: "Could not open checkout. Please try again." })
  })
})
