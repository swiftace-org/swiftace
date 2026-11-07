// Stripe webhooks delivered late, replayed and overlapping, against a real Postgres and a fake
// Stripe that holds each subscription's current state. Runs when TEST_DATABASE_URL names a
// database it may write to, which test/database-setup.ts migrates (CI's).
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"

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

type Status = "active" | "past_due" | "unpaid" | "canceled"

/** Stripe as the test drives it: each subscription's current status, and how slow a fetch is. */
const stripe = vi.hoisted(() => ({
  status: new Map<string, string>(),
  /** Delays for the next fetches, in order; a fetch reads the state when it starts. */
  delays: [] as number[],
}))

vi.mock("stripe", () => ({
  default: class {
    subscriptions = {
      retrieve: async (id: string) => {
        const status = stripe.status.get(id)!
        await new Promise((resolve) => setTimeout(resolve, stripe.delays.shift() ?? 0))
        return subscriptionObject(id, status)
      },
    }
    webhooks = {
      constructEventAsync: async (payload: string) => JSON.parse(payload) as unknown,
    }
  },
}))
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
}))
vi.mock("@/lib/utils.server", () => ({
  getSiteConfig: async () => ({
    integrations: {
      billing: { enabled: true, stripeSecretKey: "sk_test", stripeWebhookSecret: "whsec" },
    },
  }),
  requireIntegrationSetting: (value: string) => value,
  getSiteUrl: () => "https://academy.example",
  readEmailBrand: async () => ({}),
  sendSesEmail: async () => ({ success: true }),
  captureEvent: () => {},
}))

function subscriptionObject(id: string, status: string) {
  return {
    id,
    object: "subscription",
    customer: `cus_${id}`,
    metadata: { accountId: String(accountIds.get(id)) },
    status,
    cancel_at_period_end: false,
    cancel_at: null,
    items: { data: [{ current_period_end: 1_900_000_000, price: { id: "price_monthly" } }] },
  }
}

const accountIds = new Map<string, number>()

// CI always runs it, so a missing database fails there rather than skipping quietly.
describe.skipIf(!DATABASE_URL && !process.env.CI)(
  "the Stripe webhook, with events late and overlapping",
  () => {
    let schema: typeof import("@/lib/schema.server")
    let post: (request: Request) => Promise<Response>
    let eq: typeof import("drizzle-orm").eq
    let courseId: number
    let sync: typeof import("../../-lib/utils.server").syncStripeSubscription

    beforeAll(async () => {
      schema = await import("@/lib/schema.server")
      ;({ eq } = await import("drizzle-orm"))
      const { Route } = (await import("./webhook")) as unknown as {
        Route: { options: { server: { handlers: { POST: typeof post } } } }
      }
      post = (request) => Route.options.server.handlers.POST({ request } as never)
      ;({ syncStripeSubscription: sync } = await import("../../-lib/utils.server"))
      const [owner] = await schema.db
        .insert(schema.accounts)
        .values({
          name: "Owner",
          username: `owner-${Date.now()}`,
          email: `owner-${Date.now()}@example.com`,
        })
        .returning({ id: schema.accounts.id })
      const [course] = await schema.db
        .insert(schema.courses)
        .values({ ownerId: owner!.id, slug: `course-${Date.now()}`, title: "Course" })
        .returning({ id: schema.courses.id })
      courseId = course!.id
    })
    afterAll(async () => {
      await (globalThis as unknown as { __appDbPool?: { end(): Promise<void> } }).__appDbPool?.end()
    })
    beforeEach(() => {
      stripe.delays = []
    })

    /** A subscriber enrolled through their subscription, whose Stripe status is `status`. */
    async function subscriber(status: Status) {
      const id = `sub_${Math.random().toString(36).slice(2)}`
      const [account] = await schema.db
        .insert(schema.accounts)
        .values({ name: "Learner", username: id, email: `${id}@example.com` })
        .returning({ id: schema.accounts.id })
      accountIds.set(id, account!.id)
      stripe.status.set(id, status)
      await schema.db.insert(schema.courseEnrollments).values({
        courseId,
        enrolleeId: account!.id,
        paymentStatus: "SUBSCRIPTION_GRANTED",
      })
      return id
    }

    /** An event as Stripe sends it, carrying the subscription as it was when it happened. */
    function deliver(type: string, id: string, snapshotStatus: Status) {
      const event = {
        id: `evt_${Math.random()}`,
        type,
        data: { object: subscriptionObject(id, snapshotStatus) },
      }
      return post(
        new Request("https://academy.example/api/stripe/webhook", {
          method: "POST",
          headers: { "stripe-signature": "t=1,v1=test" },
          body: JSON.stringify(event),
        }),
      )
    }

    async function recorded(id: string) {
      const [subscription] = await schema.db
        .select({ status: schema.accountSubscriptions.status })
        .from(schema.accountSubscriptions)
        .where(eq(schema.accountSubscriptions.stripeSubscriptionId, id))
      const [enrollment] = await schema.db
        .select({ deleted: schema.courseEnrollments.deleted })
        .from(schema.courseEnrollments)
        .where(eq(schema.courseEnrollments.enrolleeId, accountIds.get(id)!))
      return { status: subscription?.status, enrolled: enrollment?.deleted !== true }
    }

    it("keeps a cancellation when an older `updated` arrives after the `deleted`", async () => {
      const id = await subscriber("canceled")
      expect((await deliver("customer.subscription.deleted", id, "canceled")).status).toBe(204)
      // Stripe's retry of an earlier update, from while it was still active.
      expect((await deliver("customer.subscription.updated", id, "active")).status).toBe(204)
      expect(await recorded(id)).toEqual({ status: "canceled", enrolled: false })
    })

    it("keeps a recovered subscriber's access when an older failure arrives last", async () => {
      const id = await subscriber("active")
      await deliver("customer.subscription.updated", id, "active")
      // The `unpaid` update from before the card was fixed, delivered late.
      await deliver("customer.subscription.updated", id, "unpaid")
      expect(await recorded(id)).toEqual({ status: "active", enrolled: true })
    })

    it("is unchanged by the same event replayed", async () => {
      const id = await subscriber("past_due")
      for (let i = 0; i < 3; i++) await deliver("customer.subscription.updated", id, "past_due")
      expect(await recorded(id)).toEqual({ status: "past_due", enrolled: false })
    })

    it("lets a slow fetch finish before a newer one starts, so it can't overwrite it", async () => {
      const id = await subscriber("active")
      // The first sync reads `active`, then takes a while to hear back from Stripe…
      stripe.delays = [400]
      const first = sync(id)
      await new Promise((resolve) => setTimeout(resolve, 50))
      // …during which the subscription is cancelled, and its webhook arrives.
      stripe.status.set(id, "canceled")
      const second = deliver("customer.subscription.deleted", id, "canceled")
      await Promise.all([first, second])
      expect(await recorded(id)).toEqual({ status: "canceled", enrolled: false })
    })
  },
)
