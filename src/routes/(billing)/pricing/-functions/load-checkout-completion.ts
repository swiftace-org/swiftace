import { createServerFn } from "@tanstack/react-start"

import { ENROLLMENT_GRANTED_BY_SUBSCRIPTION } from "@/lib/config"
import { createOrRestoreCourseEnrollment } from "@/lib/db.server"
import { authMiddleware, integrationMiddleware } from "@/lib/utils"
import { readCourseForViewer } from "@/lib/utils.server"

import {
  getStripeClient,
  isActiveSubscriptionStatus,
  syncStripeSubscription,
} from "../../-lib/utils.server"

/**
 * Reconciles the browser's return from Stripe Checkout. A loader that writes, deliberately:
 * the webhook is authoritative but asynchronous, and waiting on it would park every new
 * subscriber on a spinner. Both paths funnel into the idempotent `syncStripeSubscription`.
 */
export const loadCheckoutCompletion = createServerFn({ method: "GET" })
  .middleware([integrationMiddleware("billing"), authMiddleware])
  .validator((data: { sessionId: string }) => data)
  .handler(
    async ({
      data,
      context,
    }): Promise<{ isSubscribed: boolean; courseSlug: string | null; enrolled: boolean }> => {
      const { account } = context
      const pending = { isSubscribed: false, courseSlug: null, enrolled: false }

      let session
      try {
        const stripe = await getStripeClient()
        session = await stripe.checkout.sessions.retrieve(data.sessionId, {
          expand: ["subscription"],
        })
      } catch (error) {
        console.error(`Failed to retrieve Stripe checkout session ${data.sessionId}.`, error)
        return pending
      }

      // The session id travels in a URL the user can edit, so it has to be tied back to the
      // account that started it — otherwise anyone could claim somebody else's checkout.
      if (session.metadata?.accountId !== String(account.id)) {
        console.error(
          `Checkout session ${data.sessionId} belongs to account ${session.metadata?.accountId}, not ${account.id}.`,
        )
        return pending
      }

      const subscription = session.subscription
      // A bare string means Stripe didn't expand it, which only happens when the session
      // completed without one — an abandoned or still-open checkout.
      if (!subscription || typeof subscription === "string") return pending

      // Recorded as Stripe has it now, which may have moved on since the session was read.
      const synced = await syncStripeSubscription(subscription.id)

      const isSubscribed = isActiveSubscriptionStatus(synced.subscription.status)
      const courseSlug = session.metadata?.courseSlug ?? null
      if (!isSubscribed || !courseSlug) return { isSubscribed, courseSlug, enrolled: false }

      return {
        isSubscribed,
        courseSlug,
        enrolled: await enrollAfterCheckout(courseSlug, account.id),
      }
    },
  )

/**
 * Best-effort enrollment into the course the checkout started from; a failure is logged and
 * reported as false, since they are subscribed either way.
 *
 * `readCourseForViewer` rather than a bare `readCourseBySlug` matters: `courseSlug` arrives
 * from checkout metadata, which came from a `?courseSlug=` the user could type, and enrollment
 * is what grants read access to a PRIVATE course. Same gate as `submitCourseEnrollment`.
 */
async function enrollAfterCheckout(courseSlug: string, accountId: number): Promise<boolean> {
  try {
    const viewer = await readCourseForViewer(courseSlug)
    if (!viewer) return false

    const { course } = viewer
    await createOrRestoreCourseEnrollment({
      courseId: course.id,
      enrolleeId: accountId,
      paymentStatus: course.isPaid ? ENROLLMENT_GRANTED_BY_SUBSCRIPTION : null,
    })
    return true
  } catch (error) {
    console.error(`Failed to enroll account ${accountId} in ${courseSlug} after checkout.`, error)
    return false
  }
}
