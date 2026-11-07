import { createServerFn } from "@tanstack/react-start"

import { normalizeEmail } from "@/lib/utils"
import { getSiteConfig, getSiteUrl } from "@/lib/utils.server"

import { createGoogleAccount, readGoogleAccountByGoogleId } from "../-lib/db.server"
import { sanitizeNextUrl } from "../../-lib/utils"
import {
  captureLogin,
  createGoogleOAuthClient,
  fetchGoogleProfile,
  findOrCreateAccountByEmail,
  readAndClearOAuthStateCookie,
  setAuthCookie,
} from "../../-lib/utils.server"

export const completeGoogleLogin = createServerFn({ method: "GET" })
  .validator((data: { code?: string; state?: string }) => data)
  .handler(async ({ data }) => {
    const stored = readAndClearOAuthStateCookie()
    // Returned rather than thrown like the middleware would, so the callback page can say why.
    if (!(await getSiteConfig()).integrations.googleLogin.enabled) {
      return { error: "Google login is turned off. Please log in with your email instead." }
    }
    if (
      !data.code ||
      !data.state ||
      !stored?.codeVerifier ||
      stored.provider !== "google" ||
      stored.state !== data.state
    ) {
      console.error("completeGoogleLogin: invalid or expired oauth state")
      return { error: "Your Google login attempt expired. Please try again." }
    }

    const redirectUri = `${getSiteUrl()}/google/auth`

    let accessToken: string
    try {
      const client = await createGoogleOAuthClient(redirectUri)
      const tokens = await client.validateAuthorizationCode(data.code, stored.codeVerifier)
      accessToken = tokens.accessToken()
    } catch (error) {
      console.error("completeGoogleLogin: code exchange failed", error)
      return { error: "Google login failed. Please try again." }
    }

    const profile = await fetchGoogleProfile(accessToken)
    if (!profile) {
      return { error: "Google login failed. Please try again." }
    }

    const existingGoogleAccount = await readGoogleAccountByGoogleId(profile.sub)
    if (existingGoogleAccount) {
      await setAuthCookie(existingGoogleAccount.accountId)
      captureLogin({
        accountId: existingGoogleAccount.accountId,
        method: "google",
        posthogSessionId: stored.posthogSessionId,
      })
      return { success: true as const, next: sanitizeNextUrl(stored.next) }
    }

    // The email is the only thing linking this Google identity to an account, so never
    // proceed unless Google has verified that the user controls it.
    if (!profile.email_verified) {
      return {
        error:
          "Your Google account has no verified email address. Please verify your email with Google and try again.",
      }
    }

    const result = await findOrCreateAccountByEmail({
      email: profile.email,
      name: profile.name || profile.email,
    })
    if ("error" in result) {
      return { error: result.error }
    }

    const googleAccount = await createGoogleAccount({
      googleId: profile.sub,
      email: normalizeEmail(profile.email),
      emailVerified: profile.email_verified,
      accountId: result.account.id,
    })
    if (!googleAccount) {
      // A conflicting row means the provider link is already spoken for; the sign-in itself
      // is still valid, and the next attempt retries the insert.
      console.error("completeGoogleLogin: conflicting google_accounts row, skipping", {
        googleId: profile.sub,
        accountId: result.account.id,
      })
    }
    await setAuthCookie(result.account.id)
    captureLogin({
      accountId: result.account.id,
      method: "google",
      isNewAccount: result.isNewAccount,
      posthogSessionId: stored.posthogSessionId,
    })

    return { success: true as const, next: sanitizeNextUrl(stored.next) }
  })
