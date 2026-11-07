export const AUTH_TOKEN_EXPIRY_DAYS = 45

export const OAUTH_STATE_COOKIE_NAME = "OAUTH_STATE"

export const OAUTH_STATE_EXPIRY_SECONDS = 10 * 60

export const VERIFICATION_CODE_EXPIRY_SECONDS = 5 * 60

export const VERIFICATION_ATTEMPT_LIMIT_WINDOW_SECONDS = 10 * 60

export const VERIFICATION_ATTEMPT_LIMIT_MAX_TRIES = 5

export const VERIFICATION_ATTEMPT_MINIMUM_GAP_SECONDS = 30

/**
 * Wrong codes allowed before an attempt is burned. The limits above govern how often a code
 * is *sent*; this one governs how often it can be *guessed*, which is the number that decides
 * whether a 6-digit code is worth anything.
 */
export const VERIFICATION_CODE_MAX_ATTEMPTS = 5

export const LOGIN_EMAIL_PATTERN =
  /^(?!\.)(?!.*\.\.)([a-z0-9_'.+-]*)[a-z0-9_+-]@([a-z0-9][a-z0-9-]*\.)+[a-z]{2,}$/i

export const AUTHENTICATION_CONFIG_SECTION = "authentication"
