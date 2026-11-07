import { and, eq, lt, not, sql } from "drizzle-orm"

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

/**
 * Spends one of an attempt's guesses before its code is compared, returning how many it has used,
 * or null once it's consumed or out of them. One conditional UPDATE, so however many guesses
 * arrive together, only `maxGuesses` are ever compared: a read first would admit them all.
 */
export async function admitEmailAccountAttemptGuess(
  id: number,
  maxGuesses: number,
): Promise<number | null> {
  const [attempt] = await db
    .update(emailAccountAttempts)
    .set({ failedAttempts: sql`${emailAccountAttempts.failedAttempts} + 1` })
    .where(
      and(
        eq(emailAccountAttempts.id, id),
        not(sql`${emailAccountAttempts.consumed} is true`),
        lt(emailAccountAttempts.failedAttempts, maxGuesses),
      ),
    )
    .returning({ failedAttempts: emailAccountAttempts.failedAttempts })

  return attempt?.failedAttempts ?? null
}

/** Uses an attempt up, returning whether this call did: only one of several at once can. */
export async function consumeEmailAccountAttempt(id: number): Promise<boolean> {
  const consumed = await db
    .update(emailAccountAttempts)
    .set({ consumed: true })
    .where(and(eq(emailAccountAttempts.id, id), not(sql`${emailAccountAttempts.consumed} is true`)))
    .returning({ id: emailAccountAttempts.id })

  return consumed.length > 0
}
