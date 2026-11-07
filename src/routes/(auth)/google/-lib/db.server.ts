import { eq } from "drizzle-orm"

import { db, googleAccounts } from "@/lib/schema.server"
import type { GoogleAccount } from "@/types/account"

export async function readGoogleAccountByGoogleId(googleId: string): Promise<GoogleAccount | null> {
  const [account] = await db
    .select({
      id: googleAccounts.id,
      googleId: googleAccounts.googleId,
      email: googleAccounts.email,
      emailVerified: googleAccounts.emailVerified,
      accountId: googleAccounts.accountId,
    })
    .from(googleAccounts)
    .where(eq(googleAccounts.googleId, googleId))
    .limit(1)

  return account ?? null
}

/**
 * Provider rows are secondary bookkeeping, so a conflict (the same address reused under
 * a new Google `sub`) returns null rather than failing an otherwise valid sign-in. The
 * next sign-in retries the insert.
 */
export async function createGoogleAccount(values: {
  googleId: string
  email: string
  emailVerified: boolean
  accountId: number
}): Promise<GoogleAccount | null> {
  const [googleAccount] = await db
    .insert(googleAccounts)
    .values(values)
    .onConflictDoNothing()
    .returning({
      id: googleAccounts.id,
      googleId: googleAccounts.googleId,
      email: googleAccounts.email,
      emailVerified: googleAccounts.emailVerified,
      accountId: googleAccounts.accountId,
    })

  return googleAccount ?? null
}
