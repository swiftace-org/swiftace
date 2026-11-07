import { createServerFn } from "@tanstack/react-start"

import { readEmailAccountAttemptByStateToken } from "../-lib/db.server"
import {
  checkVerificationAttemptRateLimit,
  issueEmailVerificationAttempt,
} from "../../-lib/utils.server"

/**
 * Sends a fresh code for an attempt in progress, returning a new `state` because issuing one
 * writes a new attempt row and burns this one. Keyed on `state_token`, not the sequential id,
 * which would let anyone walk the range and have mail sent to arbitrary addresses.
 */
export const resendVerificationEmail = createServerFn({ method: "POST" })
  .validator((data: { state: string; next?: string }) => data)
  .handler(async ({ data }) => {
    if (!data.state) {
      return { error: "Invalid attempt. Please try logging in again." }
    }

    const attempt = await readEmailAccountAttemptByStateToken(data.state)
    if (!attempt) {
      console.error("resendVerificationEmail: attempt not found")
      return { error: "Invalid attempt. Please try logging in again." }
    }

    const rateLimit = await checkVerificationAttemptRateLimit(attempt.email)
    if (!rateLimit.allowed) {
      console.error("resendVerificationEmail: rate limit exceeded", {
        attemptId: attempt.id,
        error: rateLimit.error,
      })
      return { error: rateLimit.error ?? "Too many requests. Please try again later." }
    }

    return issueEmailVerificationAttempt(attempt.email, data.next)
  })
