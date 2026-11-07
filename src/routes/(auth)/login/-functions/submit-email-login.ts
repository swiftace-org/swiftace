import { createServerFn } from "@tanstack/react-start"

import {
  checkVerificationAttemptRateLimit,
  issueEmailVerificationAttempt,
  validateTurnstileToken,
} from "../../-lib/utils.server"

const EMAIL_PATTERN =
  /^(?!\.)(?!.*\.\.)([a-z0-9_'.+-]*)[a-z0-9_+-]@([a-z0-9][a-z0-9-]*\.)+[a-z]{2,}$/i

export const submitEmailLoginForm = createServerFn({ method: "POST" })
  .validator((data: { email: string; turnstileToken: string; next?: string }) => data)
  .handler(async ({ data }) => {
    const { email, turnstileToken } = data

    if (!EMAIL_PATTERN.test(email)) {
      console.error("submitEmailLoginForm: email failed validation", { email })
      return { error: "Please enter a valid email address." }
    }

    const turnstileResult = await validateTurnstileToken(turnstileToken)
    if (!turnstileResult.success) {
      console.error("submitEmailLoginForm: turnstile validation failed", turnstileResult)
      return { error: "Verification failed. Please try again." }
    }

    const rateLimit = await checkVerificationAttemptRateLimit(email)
    if (!rateLimit.allowed) {
      console.error("submitEmailLoginForm: rate limit exceeded", { email, error: rateLimit.error })
      return { error: rateLimit.error ?? "Too many requests. Please try again later." }
    }

    return issueEmailVerificationAttempt(email, data.next)
  })
