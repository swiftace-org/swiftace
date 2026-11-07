import { eq, sql } from "drizzle-orm"

import { db, emailAccountAttempts } from "@/lib/schema.server"
import type { EmailAccountAttempt } from "@/types/account"

import { emailAccountAttemptColumns } from "../../-lib/db.server"

/**
 * The verify page's entry point, keyed on the opaque `state_token` rather than the id so an attempt
 * is only reachable by whoever started it. Never call it with an empty string: legacy rows have a
 * NULL token, and matching one would read somebody else's attempt.
 */
export async function readEmailAccountAttemptByStateToken(
  stateToken: string,
): Promise<EmailAccountAttempt | null> {
  const [attempt] = await db
    .select(emailAccountAttemptColumns)
    .from(emailAccountAttempts)
    .where(eq(emailAccountAttempts.stateToken, stateToken))
    .limit(1)

  return attempt ?? null
}

export async function readEmailAccountAttemptByTokenHash(
  tokenHash: string,
): Promise<EmailAccountAttempt | null> {
  const [attempt] = await db
    .select(emailAccountAttemptColumns)
    .from(emailAccountAttempts)
    .where(eq(emailAccountAttempts.tokenHash, tokenHash))
    .limit(1)

  return attempt ?? null
}

export async function updateEmailAccountAttemptConsumed(
  id: number,
  consumed: boolean,
): Promise<void> {
  await db.update(emailAccountAttempts).set({ consumed }).where(eq(emailAccountAttempts.id, id))
}

/**
 * Counts one wrong verification code and returns the new total. Incremented in the database, so
 * codes guessed in parallel each cost a try — a read-modify-write would let them overwrite.
 */
export async function updateEmailAccountAttemptFailedAttempts(id: number): Promise<number> {
  const [attempt] = await db
    .update(emailAccountAttempts)
    .set({ failedAttempts: sql`${emailAccountAttempts.failedAttempts} + 1` })
    .where(eq(emailAccountAttempts.id, id))
    .returning({ failedAttempts: emailAccountAttempts.failedAttempts })

  return attempt?.failedAttempts ?? 0
}
