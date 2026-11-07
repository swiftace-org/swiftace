import { eq } from "drizzle-orm"

import { db, githubAccounts } from "@/lib/schema.server"
import type { GithubAccount } from "@/types/account"

export async function readGithubAccountByGithubId(githubId: string): Promise<GithubAccount | null> {
  const [account] = await db
    .select({
      id: githubAccounts.id,
      githubId: githubAccounts.githubId,
      username: githubAccounts.username,
      email: githubAccounts.email,
      accountId: githubAccounts.accountId,
    })
    .from(githubAccounts)
    .where(eq(githubAccounts.githubId, githubId))
    .limit(1)

  return account ?? null
}

/** Same conflict tolerance as `createGoogleAccount` — e.g. a recycled GitHub username. */
export async function createGithubAccount(values: {
  githubId: string
  username: string
  normalizedUsername: string
  email: string
  emailVerified: boolean
  emailPrimary: boolean
  displayName: string | null
  profileUrl: string | null
  accountId: number
}): Promise<GithubAccount | null> {
  const [githubAccount] = await db
    .insert(githubAccounts)
    .values(values)
    .onConflictDoNothing()
    .returning({
      id: githubAccounts.id,
      githubId: githubAccounts.githubId,
      username: githubAccounts.username,
      email: githubAccounts.email,
      accountId: githubAccounts.accountId,
    })

  return githubAccount ?? null
}
