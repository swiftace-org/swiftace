import { createServerFn } from "@tanstack/react-start"

import { normalizeEmail } from "@/lib/utils"
import { getSiteConfig, getSiteUrl } from "@/lib/utils.server"

import { createGithubAccount, readGithubAccountByGithubId } from "../-lib/db.server"
import { sanitizeNextUrl } from "../../-lib/utils"
import {
  captureLogin,
  createGitHubOAuthClient,
  fetchGithubProfile,
  findOrCreateAccountByEmail,
  normalizeUsername,
  readAndClearOAuthStateCookie,
  setAuthCookie,
} from "../../-lib/utils.server"

export const completeGithubLogin = createServerFn({ method: "GET" })
  .validator((data: { code?: string; state?: string }) => data)
  .handler(async ({ data }) => {
    const stored = readAndClearOAuthStateCookie()
    // Returned rather than thrown like the middleware would, so the callback page can say why.
    if (!(await getSiteConfig()).integrations.githubLogin.enabled) {
      return { error: "GitHub login is turned off. Please log in with your email instead." }
    }
    if (
      !data.code ||
      !data.state ||
      !stored ||
      stored.provider !== "github" ||
      stored.state !== data.state
    ) {
      console.error("completeGithubLogin: invalid or expired oauth state")
      return { error: "Your GitHub login attempt expired. Please try again." }
    }

    const redirectUri = `${getSiteUrl()}/github/auth`

    let accessToken: string
    try {
      const client = await createGitHubOAuthClient(redirectUri)
      const tokens = await client.validateAuthorizationCode(data.code)
      accessToken = tokens.accessToken()
    } catch (error) {
      console.error("completeGithubLogin: code exchange failed", error)
      return { error: "GitHub login failed. Please try again." }
    }

    const profile = await fetchGithubProfile(accessToken)
    if (!profile) {
      return { error: "GitHub login failed. Please try again." }
    }

    const existingGithubAccount = await readGithubAccountByGithubId(profile.id)
    if (existingGithubAccount) {
      await setAuthCookie(existingGithubAccount.accountId)
      captureLogin({
        accountId: existingGithubAccount.accountId,
        method: "github",
        posthogSessionId: stored.posthogSessionId,
      })
      return { success: true as const, next: sanitizeNextUrl(stored.next) }
    }

    // The email is the only thing linking this GitHub identity to an account, so never
    // proceed unless GitHub has verified that the user controls it.
    const email = profile.email
    if (!email) {
      return {
        error:
          "Your GitHub account has no verified email address. Please verify your email on GitHub and try again.",
      }
    }

    const result = await findOrCreateAccountByEmail({
      email,
      name: profile.name || profile.username,
      usernameHint: profile.username,
    })
    if ("error" in result) {
      return { error: result.error }
    }

    const githubAccount = await createGithubAccount({
      githubId: profile.id,
      username: profile.username,
      normalizedUsername: normalizeUsername(profile.username),
      email: normalizeEmail(email),
      // `fetchGithubProfile` only ever returns an address GitHub reports as verified.
      emailVerified: true,
      emailPrimary: true,
      displayName: profile.name,
      profileUrl: profile.profileUrl,
      accountId: result.account.id,
    })
    if (!githubAccount) {
      // A recycled GitHub username can collide here; the sign-in itself is still valid,
      // and the next attempt retries the insert.
      console.error("completeGithubLogin: conflicting github_accounts row, skipping", {
        githubId: profile.id,
        accountId: result.account.id,
      })
    }
    await setAuthCookie(result.account.id)
    captureLogin({
      accountId: result.account.id,
      method: "github",
      isNewAccount: result.isNewAccount,
      posthogSessionId: stored.posthogSessionId,
    })

    return { success: true as const, next: sanitizeNextUrl(stored.next) }
  })
