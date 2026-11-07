import type { PublicSiteConfig } from "@/types/site-config"

export type Account = {
  id: number
  name: string
  username: string
  email: string
  isAdmin: boolean
  flaggedAsSpammer: boolean
  createdAt: Date
}

export type JWTPayload = {
  accountId: number
  exp: number
  iat: number
}

/**
 * What the root route resolves once per request and every other route reads from context.
 * `hasActiveSubscription` is false whenever signed out. `siteConfig` rides along because every
 * page needs it, and this is already fetched and cached on every navigation.
 */
export type CurrentSession = {
  account: Account | null
  hasActiveSubscription: boolean
  siteConfig: PublicSiteConfig
}

export type TurnstileValidationResponse = {
  success: boolean
  challenge_ts?: string
  hostname?: string
  "error-codes"?: string[]
  action?: string
  cdata?: string
  metadata?: { ephemeral_id?: string }
}

export type EmailAccountAttempt = {
  id: number
  email: string
  codeHash: string | null
  tokenHash: string | null
  createdAt: Date
  consumed: boolean
  failedAttempts: number
}

export type GoogleAccount = {
  id: number
  googleId: string
  email: string
  emailVerified: boolean
  accountId: number
}

export type GithubAccount = {
  id: number
  githubId: string
  username: string
  email: string
  accountId: number
}

export type OAuthStateCookieValue = {
  provider: "google" | "github"
  state: string
  codeVerifier?: string
  /** Where to send the user once the provider redirects back, already sanitized. */
  next?: string
  /** The browser's PostHog session, for the login event the callback captures server-side. */
  posthogSessionId?: string
}

export type GoogleProfile = {
  sub: string
  email: string
  email_verified: boolean
  name: string
}

export type GithubProfile = {
  id: string
  username: string
  name: string | null
  /** Only set when GitHub reports the address as verified. */
  email: string | null
  profileUrl: string | null
}
