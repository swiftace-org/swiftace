import { and, desc, eq, sql } from "drizzle-orm"

import { ENROLLMENT_GRANTED_BY_SUBSCRIPTION, ENROLLMENT_REVOKED_BY_LAPSE } from "@/lib/config"
import { subscriptionColumns } from "@/lib/db.server"
import { type Queryable, accountSubscriptions, courseEnrollments, db } from "@/lib/schema.server"
import type { AccountSubscription } from "@/types/subscription"

/**
 * The account's most recent subscription whatever its status, which is how a returning
 * subscriber's Stripe customer is recovered. Reusing it keeps Checkout from minting a
 * second customer for the same person on every resubscribe.
 */
export async function readLatestSubscriptionByAccountId(
  accountId: number,
): Promise<AccountSubscription | null> {
  const [subscription] = await db
    .select(subscriptionColumns)
    .from(accountSubscriptions)
    .where(eq(accountSubscriptions.accountId, accountId))
    .orderBy(desc(accountSubscriptions.createdAt))
    .limit(1)

  return subscription ?? null
}

/**
 * Any subscription we hold for a Stripe customer, which is how one created outside our Checkout —
 * carrying no metadata — is traced back to an account. All of a customer's rows share an account,
 * so which comes back doesn't matter; only its `accountId` is read.
 */
export async function readSubscriptionByStripeCustomerId(
  stripeCustomerId: string,
): Promise<AccountSubscription | null> {
  const [subscription] = await db
    .select(subscriptionColumns)
    .from(accountSubscriptions)
    .where(eq(accountSubscriptions.stripeCustomerId, stripeCustomerId))
    .orderBy(desc(accountSubscriptions.createdAt))
    .limit(1)

  return subscription ?? null
}

/**
 * Upserts a Stripe subscription, keyed on Stripe's own id — the webhook and the browser back
 * from Checkout race here by design, so `accountId` and `stripeCustomerId` are left out of the
 * update and whoever wrote first stays the owner. The returned owner is therefore not always
 * the one passed in, and callers must apply enrollment changes to *that* id. `created` is true
 * for exactly one of those racing calls, which is what keeps one-off emails from going twice.
 */
export async function createOrUpdateAccountSubscription(
  values: {
    accountId: number
    stripeCustomerId: string
    stripeSubscriptionId: string
    stripePriceId: string | null
    status: string
    currentPeriodEnd: Date | null
    cancelAtPeriodEnd: boolean
  },
  tx: Queryable = db,
): Promise<{ accountId: number; created: boolean }> {
  const [row] = await tx
    .insert(accountSubscriptions)
    .values(values)
    .onConflictDoUpdate({
      target: accountSubscriptions.stripeSubscriptionId,
      set: {
        status: values.status,
        stripePriceId: values.stripePriceId,
        currentPeriodEnd: values.currentPeriodEnd,
        cancelAtPeriodEnd: values.cancelAtPeriodEnd,
        updatedAt: new Date(),
      },
    })
    // `xmax` is zero only on a freshly inserted row, never on one the conflict branch updated.
    .returning({ accountId: accountSubscriptions.accountId, created: sql<boolean>`xmax = 0` })

  // The upsert has no `where`, so it always writes exactly one row and always returns it;
  // falling back to the input keeps this honest without an unreachable error path.
  return row ?? { accountId: values.accountId, created: false }
}

/**
 * Puts back the enrollments a lapse revoked, scoped to rows carrying the lapse marker so that
 * admin removals stay removed. The marker returns to `ENROLLMENT_GRANTED_BY_SUBSCRIPTION`
 * rather than NULL, so a second lapse can revoke again; NULL would buy the course outright.
 */
export async function restoreLapsedCourseEnrollments(
  enrolleeId: number,
  tx: Queryable = db,
): Promise<number> {
  const restored = await tx
    .update(courseEnrollments)
    .set({ deleted: false, paymentStatus: ENROLLMENT_GRANTED_BY_SUBSCRIPTION })
    .where(
      and(
        eq(courseEnrollments.enrolleeId, enrolleeId),
        eq(courseEnrollments.deleted, true),
        eq(courseEnrollments.paymentStatus, ENROLLMENT_REVOKED_BY_LAPSE),
      ),
    )
    .returning({ courseId: courseEnrollments.courseId })

  return restored.length
}

/**
 * Revokes only the enrollments the subscription itself granted, now that it has lapsed;
 * progress, submissions and certificates are untouched.
 *
 * Scoped to `ENROLLMENT_GRANTED_BY_SUBSCRIPTION`, which is the whole safety property: admin
 * grants and outright purchases carry a NULL `payment_status` and must never be stripped.
 * Revoked rows are stamped `ENROLLMENT_REVOKED_BY_LAPSE`, which the restore keys off.
 */
export async function softDeleteLapsedCourseEnrollments(
  enrolleeId: number,
  tx: Queryable = db,
): Promise<number> {
  const revoked = await tx
    .update(courseEnrollments)
    .set({ deleted: true, paymentStatus: ENROLLMENT_REVOKED_BY_LAPSE })
    .where(
      and(
        eq(courseEnrollments.enrolleeId, enrolleeId),
        eq(courseEnrollments.deleted, false),
        eq(courseEnrollments.paymentStatus, ENROLLMENT_GRANTED_BY_SUBSCRIPTION),
      ),
    )
    .returning({ courseId: courseEnrollments.courseId })

  return revoked.length
}
