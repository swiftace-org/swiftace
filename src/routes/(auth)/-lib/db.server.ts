import { and, desc, eq, gte, ne } from "drizzle-orm"

import { accounts, db, emailAccountAttempts, siteConfig } from "@/lib/schema.server"
import type { Account, EmailAccountAttempt } from "@/types/account"

import { AUTHENTICATION_CONFIG_SECTION } from "./constants"

export const emailAccountAttemptColumns = {
  id: emailAccountAttempts.id,
  email: emailAccountAttempts.email,
  codeHash: emailAccountAttempts.codeHash,
  tokenHash: emailAccountAttempts.tokenHash,
  createdAt: emailAccountAttempts.createdAt,
  consumed: emailAccountAttempts.consumed,
  failedAttempts: emailAccountAttempts.failedAttempts,
}

export async function readRecentEmailAccountAttempts(
  email: string,
  windowSeconds: number,
): Promise<EmailAccountAttempt[]> {
  return db
    .select(emailAccountAttemptColumns)
    .from(emailAccountAttempts)
    .where(
      and(
        eq(emailAccountAttempts.email, email),
        gte(emailAccountAttempts.createdAt, new Date(Date.now() - windowSeconds * 1000)),
      ),
    )
    .orderBy(desc(emailAccountAttempts.createdAt))
}

export async function createAccount(values: {
  name: string
  username: string
  normalizedUsername: string
  email: string
}): Promise<Account> {
  const [account] = await db.insert(accounts).values(values).returning({
    id: accounts.id,
    name: accounts.name,
    username: accounts.username,
    email: accounts.email,
    isAdmin: accounts.isAdmin,
    flaggedAsSpammer: accounts.flaggedAsSpammer,
    createdAt: accounts.createdAt,
  })

  return account
}

export async function createEmailAccountAttempt(values: {
  email: string
  ipAddress: string | null
  codeHash: string
  tokenHash: string
  stateToken: string
}): Promise<{ id: number; createdAt: Date }> {
  const [attempt] = await db
    .insert(emailAccountAttempts)
    .values({ ...values, emailTriggered: true })
    .returning({ id: emailAccountAttempts.id, createdAt: emailAccountAttempts.createdAt })

  return attempt
}

/**
 * Burns every outstanding attempt for an address except the one just issued, so an older
 * code in the user's inbox can't be replayed. Rows written before `consumed` gained a
 * default are NULL, which also counts as outstanding.
 */
export async function updateEmailAccountAttemptsConsumedExcept(
  email: string,
  exceptAttemptId: number,
): Promise<void> {
  await db
    .update(emailAccountAttempts)
    .set({ consumed: true })
    .where(
      and(
        eq(emailAccountAttempts.email, email),
        ne(emailAccountAttempts.id, exceptAttemptId),
        eq(emailAccountAttempts.consumed, false),
      ),
    )
}

export async function readAuthenticationKeys(): Promise<unknown> {
  const [row] = await db
    .select({ data: siteConfig.data })
    .from(siteConfig)
    .where(eq(siteConfig.section, AUTHENTICATION_CONFIG_SECTION))
  return row?.data
}
