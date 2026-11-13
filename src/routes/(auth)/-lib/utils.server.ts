import crypto, { randomBytes } from "node:crypto"

import { deleteCookie, getCookie, getRequestIP, setCookie } from "@tanstack/react-start/server"
import { GitHub, Google } from "arctic"
import jwt from "jsonwebtoken"

import EmailVerificationEmail from "@/emails/email-verification-email"
import {
  ACCOUNT_EMAIL_MAX_LENGTH,
  ACCOUNT_NAME_MAX_LENGTH,
  ACCOUNT_USERNAME_MAX_LENGTH,
  AUTH_COOKIE_NAME,
} from "@/lib/config"
import { NODE_ENV } from "@/lib/config.server"
import { readAccountByEmail, readAccountByEmailCaseInsensitive } from "@/lib/db.server"
import { normalizeEmail, slugify } from "@/lib/utils"
import {
  captureEvent,
  generateToken,
  getSiteConfig,
  getSiteUrl,
  readEmailBrand,
  requireIntegrationSetting,
  sendSesEmail,
} from "@/lib/utils.server"
import type {
  Account,
  GithubProfile,
  GoogleProfile,
  OAuthStateCookieValue,
  TurnstileValidationResponse,
} from "@/types/account"
import type { LoginMethod } from "@/types/analytics"

import { getAuthenticationKeys } from "./authentication.server"
import {
  AUTH_TOKEN_EXPIRY_DAYS,
  OAUTH_STATE_COOKIE_NAME,
  OAUTH_STATE_EXPIRY_SECONDS,
  VERIFICATION_ATTEMPT_LIMIT_MAX_TRIES,
  VERIFICATION_ATTEMPT_LIMIT_WINDOW_SECONDS,
  VERIFICATION_ATTEMPT_MINIMUM_GAP_SECONDS,
  VERIFICATION_CODE_EXPIRY_SECONDS,
} from "./constants"
import {
  createAccount,
  createEmailAccountAttempt,
  readRecentEmailAccountAttempts,
  updateEmailAccountAttemptsConsumedExcept,
} from "./db.server"
import { sanitizeNextUrl } from "./utils"

export async function hashString(input: string): Promise<string> {
  const { hashKey } = await getAuthenticationKeys()
  return crypto.createHmac("sha256", hashKey).update(input).digest("hex")
}

export function generateVerificationCode(): string {
  return crypto.randomInt(100000, 1000000).toString()
}

export async function setAuthCookie(accountId: number): Promise<void> {
  const { signingKey } = await getAuthenticationKeys()
  const token = jwt.sign({ accountId }, signingKey, {
    expiresIn: `${AUTH_TOKEN_EXPIRY_DAYS}d`,
  })
  setCookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: NODE_ENV === "production",
    sameSite: "lax",
    maxAge: AUTH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
    path: "/",
  })
}

/** Mirrors the value stored in `accounts.normalized_username`, which is uniquely indexed. */
export function normalizeUsername(username: string): string {
  return username.replace(/-/g, "")
}

const USERNAME_SUFFIX_BYTES = 3
/** Leaves room for the `-` plus a hex suffix appended on collision. */
const USERNAME_BASE_MAX_LENGTH = ACCOUNT_USERNAME_MAX_LENGTH - USERNAME_SUFFIX_BYTES * 2 - 1
const CREATE_ACCOUNT_MAX_ATTEMPTS = 5

/** Unique index names from `schema.server.ts` — renaming one there must be mirrored here. */
const USERNAME_UNIQUE_CONSTRAINTS = ["ix_accounts_username", "ix_accounts_normalized_username"]
const EMAIL_UNIQUE_CONSTRAINTS = ["accounts_email_key"]

type PostgresErrorFields = { code?: string; constraint?: string; detail?: string; message?: string }

/** Drizzle wraps every driver error in a `DrizzleQueryError`, leaving node-postgres's on `cause`. */
function getPostgresError(error: unknown): PostgresErrorFields {
  const cause = error instanceof Error && error.cause ? error.cause : error
  if (typeof cause !== "object" || cause === null) return {}
  const { code, constraint, detail, message } = cause as PostgresErrorFields
  return { code, constraint, detail, message }
}

function isUniqueViolation(error: unknown, constraints: string[]): boolean {
  // 23505 is `unique_violation`.
  const { code, constraint } = getPostgresError(error)
  return code === "23505" && constraints.includes(constraint ?? "")
}

/**
 * Inserts optimistically and adds a random suffix on collision, since the unique indexes are the
 * only truth and probing first just adds a race. `john-doe` and `johndoe` share a normalized form.
 */
async function createAccountWithUniqueUsername({
  name,
  email,
  usernameHint,
}: {
  name: string
  email: string
  usernameHint?: string
}): Promise<Account> {
  const base =
    slugify(usernameHint || email.split("@")[0])
      .slice(0, USERNAME_BASE_MAX_LENGTH)
      .replace(/-+$/, "") || "user"

  for (let attempt = 1; ; attempt++) {
    const username =
      attempt === 1 ? base : `${base}-${randomBytes(USERNAME_SUFFIX_BYTES).toString("hex")}`
    try {
      return await createAccount({
        name,
        username,
        normalizedUsername: normalizeUsername(username),
        email,
      })
    } catch (error) {
      if (!isUniqueViolation(error, USERNAME_UNIQUE_CONSTRAINTS)) throw error
      if (attempt === CREATE_ACCOUNT_MAX_ATTEMPTS) throw error
      console.error("createAccountWithUniqueUsername: username taken, retrying with a suffix", {
        username,
        attempt,
      })
    }
  }
}

export type FindOrCreateAccountResult =
  | { account: Account; isNewAccount: boolean }
  | { error: string }

/**
 * Resolves the account for a verified email address, creating one if this is a first
 * sign-in. Shared by the email, Google and GitHub flows. Returns a user-safe message
 * instead of throwing, so callers never surface a raw DB error.
 */
export async function findOrCreateAccountByEmail({
  email,
  name,
  usernameHint,
}: {
  email: string
  name: string | undefined
  usernameHint?: string
}): Promise<FindOrCreateAccountResult> {
  const normalizedEmail = normalizeEmail(email)

  const existing =
    (await readAccountByEmail(normalizedEmail)) ??
    (await readAccountByEmailCaseInsensitive(normalizedEmail))
  if (existing) return { account: existing, isNewAccount: false }

  const trimmedName = name?.trim()
  if (!trimmedName) {
    console.error("findOrCreateAccountByEmail: name required for new account", {
      email: normalizedEmail,
    })
    return { error: "Please enter your full name." }
  }
  if (normalizedEmail.length > ACCOUNT_EMAIL_MAX_LENGTH) {
    console.error("findOrCreateAccountByEmail: email too long", { email: normalizedEmail })
    return { error: "That email address is too long to register." }
  }

  try {
    const account = await createAccountWithUniqueUsername({
      // Provider display names are unbounded, and the column is `varchar(64)`.
      name: trimmedName.slice(0, ACCOUNT_NAME_MAX_LENGTH),
      email: normalizedEmail,
      usernameHint,
    })
    return { account, isNewAccount: true }
  } catch (error) {
    if (isUniqueViolation(error, EMAIL_UNIQUE_CONSTRAINTS)) {
      // A row exists that the reads filtered out — almost always a soft-deleted account.
      console.error("findOrCreateAccountByEmail: email already registered", {
        email: normalizedEmail,
      })
      return { error: "An account already exists for this email address. Please contact support." }
    }
    console.error("findOrCreateAccountByEmail: failed to create account", {
      email: normalizedEmail,
      ...getPostgresError(error),
      error,
    })
    return { error: "We couldn't create your account. Please try again." }
  }
}

/** PostHog's session ids are UUIDs; anything else came from a tampered request and is dropped. */
const POSTHOG_SESSION_ID_PATTERN = /^[0-9a-f-]{36}$/i

/**
 * `posthogSessionId` comes from the browser, and is sent on as `$session_id` so PostHog can link
 * the event to the session recording, which a server-side event otherwise has no way to reach.
 */
export function captureLogin({
  accountId,
  method,
  isNewAccount = false,
  posthogSessionId,
}: {
  accountId: number
  method: LoginMethod
  isNewAccount?: boolean
  posthogSessionId?: string
}) {
  const sessionId =
    typeof posthogSessionId === "string" && POSTHOG_SESSION_ID_PATTERN.test(posthogSessionId)
      ? posthogSessionId
      : undefined
  captureEvent(accountId, isNewAccount ? "signed_up" : "logged_in", {
    method,
    ...(sessionId && { $session_id: sessionId }),
  })
}

export function getClientIpAddress(): string | null {
  return getRequestIP({ xForwardedFor: true }) ?? null
}

export async function createGoogleOAuthClient(redirectUri: string): Promise<Google> {
  const { googleLogin } = (await getSiteConfig()).integrations
  return new Google(
    requireIntegrationSetting(googleLogin.clientId, "The Google client ID"),
    requireIntegrationSetting(googleLogin.clientSecret, "The Google client secret"),
    redirectUri,
  )
}

export async function createGitHubOAuthClient(redirectUri: string): Promise<GitHub> {
  const { githubLogin } = (await getSiteConfig()).integrations
  return new GitHub(
    requireIntegrationSetting(githubLogin.clientId, "The GitHub client ID"),
    requireIntegrationSetting(githubLogin.clientSecret, "The GitHub client secret"),
    redirectUri,
  )
}

export function setOAuthStateCookie(value: OAuthStateCookieValue): void {
  setCookie(OAUTH_STATE_COOKIE_NAME, JSON.stringify(value), {
    httpOnly: true,
    secure: NODE_ENV === "production",
    sameSite: "lax",
    maxAge: OAUTH_STATE_EXPIRY_SECONDS,
    path: "/",
  })
}

export function readAndClearOAuthStateCookie(): OAuthStateCookieValue | null {
  const raw = getCookie(OAUTH_STATE_COOKIE_NAME)
  deleteCookie(OAUTH_STATE_COOKIE_NAME, { path: "/" })
  if (!raw) return null

  try {
    return JSON.parse(raw) as OAuthStateCookieValue
  } catch {
    return null
  }
}

export async function fetchGoogleProfile(accessToken: string): Promise<GoogleProfile | null> {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) {
    console.error("fetchGoogleProfile: userinfo request failed", { status: response.status })
    return null
  }

  return response.json()
}

export async function fetchGithubProfile(accessToken: string): Promise<GithubProfile | null> {
  // GitHub rejects requests without a User-Agent, and asks for the app's name in it.
  const { siteName } = (await getSiteConfig()).general
  const headers = { Authorization: `Bearer ${accessToken}`, "User-Agent": siteName }

  const profileResponse = await fetch("https://api.github.com/user", { headers })
  if (!profileResponse.ok) {
    console.error("fetchGithubProfile: user request failed", { status: profileResponse.status })
    return null
  }
  const profile = await profileResponse.json()

  // The public `profile.email` carries no verification status, so always resolve the address from
  // /user/emails and only ever trust one GitHub has verified.
  let email: string | null = null
  const emailsResponse = await fetch("https://api.github.com/user/emails", { headers })
  if (emailsResponse.ok) {
    const emails: { email: string; primary: boolean; verified: boolean }[] =
      await emailsResponse.json()
    const verified = emails.filter((candidate) => candidate.verified)
    email = (verified.find((candidate) => candidate.primary) ?? verified[0])?.email ?? null
  } else {
    console.error("fetchGithubProfile: emails request failed", { status: emailsResponse.status })
  }
  if (!email) {
    console.error("fetchGithubProfile: no verified email address", { githubId: profile.id })
  }

  return {
    id: String(profile.id),
    username: profile.login,
    name: profile.name,
    email,
    profileUrl: profile.html_url,
  }
}

/** Passes every token while Turnstile is switched off, since the forms don't render the widget then. */
export async function validateTurnstileToken(token: string): Promise<TurnstileValidationResponse> {
  const { turnstile } = (await getSiteConfig()).integrations
  if (!turnstile.enabled) return { success: true }
  const secret = requireIntegrationSetting(turnstile.secretKey, "The Turnstile secret key")

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret, response: token }),
  })

  if (!response.ok) {
    console.error("validateTurnstileToken: siteverify request failed", {
      status: response.status,
      statusText: response.statusText,
    })
  }

  const data: TurnstileValidationResponse = await response.json()
  if (!data.success) {
    console.error("validateTurnstileToken: token rejected by Cloudflare", data)
  }

  return data
}

export async function checkVerificationAttemptRateLimit(
  email: string,
): Promise<{ allowed: boolean; error?: string }> {
  const now = Date.now()
  // Normalized, because the bucket is looked up with an exact match: without this
  // `foo@x.com` and `Foo@x.com` are separate budgets, and the cap is a formality.
  const recentAttempts = await readRecentEmailAccountAttempts(
    normalizeEmail(email),
    VERIFICATION_ATTEMPT_LIMIT_WINDOW_SECONDS,
  )

  if (recentAttempts.length >= VERIFICATION_ATTEMPT_LIMIT_MAX_TRIES) {
    const nthMostRecentAttempt = recentAttempts[VERIFICATION_ATTEMPT_LIMIT_MAX_TRIES - 1]
    const windowMs = VERIFICATION_ATTEMPT_LIMIT_WINDOW_SECONDS * 1000
    const timeSinceNthAttempt = now - nthMostRecentAttempt.createdAt.getTime()
    const minutesRemaining = Math.ceil((windowMs - timeSinceNthAttempt) / (60 * 1000))
    return { allowed: false, error: `Too many requests! Try again in ${minutesRemaining} min.` }
  }

  const mostRecentAttempt = recentAttempts[0]
  if (mostRecentAttempt) {
    const timeSinceLastAttempt = now - mostRecentAttempt.createdAt.getTime()
    const minimumGapMs = VERIFICATION_ATTEMPT_MINIMUM_GAP_SECONDS * 1000
    if (timeSinceLastAttempt < minimumGapMs) {
      const secondsRemaining = Math.ceil((minimumGapMs - timeSinceLastAttempt) / 1000 / 10) * 10
      return { allowed: false, error: `Too many requests! Try again in ${secondsRemaining}s.` }
    }
  }

  return { allowed: true }
}

/**
 * Sends a fresh verification code and records the attempt, burning any earlier one for the same
 * address. The email goes out before the row is written, so a delivery failure doesn't consume
 * the user's rate-limit budget for an email they never received.
 */
export async function issueEmailVerificationAttempt(
  rawEmail: string,
  next?: string,
): Promise<{ stateToken: string; createdAtMs: number } | { error: string }> {
  // Stored normalized so the rate-limit bucket and the burn-the-previous-code update, both
  // exact-match lookups, agree with `checkVerificationAttemptRateLimit`.
  const email = normalizeEmail(rawEmail)
  const verificationCode = generateVerificationCode()
  const token = generateToken()
  const stateToken = generateToken()

  const emailResult = await sendVerificationEmail({ email, verificationCode, token, next })
  if (!emailResult.success) {
    console.error("issueEmailVerificationAttempt: failed to send verification email", {
      email,
      error: emailResult.error,
    })
    return { error: "Failed to send verification email. Please try again." }
  }

  const attempt = await createEmailAccountAttempt({
    email,
    ipAddress: getClientIpAddress(),
    codeHash: await hashString(verificationCode),
    tokenHash: await hashString(token),
    stateToken,
  })
  await updateEmailAccountAttemptsConsumedExcept(email, attempt.id)

  return { stateToken, createdAtMs: attempt.createdAt.getTime() }
}

export async function sendVerificationEmail({
  email,
  verificationCode,
  token,
  next,
}: {
  email: string
  verificationCode: string
  token: string
  next?: string
}): Promise<{ success: boolean; error?: unknown }> {
  const expiryMinutes = Math.floor(VERIFICATION_CODE_EXPIRY_SECONDS / 60)
  const siteUrl = getSiteUrl()
  const verificationUrl = new URL("/login/verify", siteUrl)
  verificationUrl.searchParams.set("token", token)
  const safeNext = sanitizeNextUrl(next)
  if (safeNext) verificationUrl.searchParams.set("next", safeNext)
  const brand = await readEmailBrand()

  const result = await sendSesEmail({
    to: email,
    subject: `Your verification code for ${brand.siteName}: ${verificationCode}`,
    reactBody: EmailVerificationEmail({
      brand,
      verificationCode,
      verificationUrl: verificationUrl.toString(),
      email,
      expiryMinutes,
    }),
  })

  if (!result.success) {
    return { success: false, error: result.error }
  }
  return { success: true }
}
