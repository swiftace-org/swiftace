import { createServerFn } from "@tanstack/react-start"

import {
  admitEmailAccountAttemptGuess,
  consumeEmailAccountAttempt,
  readEmailAccountAttemptByStateToken,
} from "../-lib/db.server"
import {
  VERIFICATION_CODE_EXPIRY_SECONDS,
  VERIFICATION_CODE_MAX_ATTEMPTS,
} from "../../-lib/constants"
import {
  captureLogin,
  findOrCreateAccountByEmail,
  hashString,
  setAuthCookie,
  validateTurnstileToken,
} from "../../-lib/utils.server"

/**
 * Trades a verification code for a session. Addressed by `state_token` rather than the
 * sequential id, which would let anyone point this at somebody else's login. Each guess spends
 * one of `VERIFICATION_CODE_MAX_ATTEMPTS` before it's compared, and a right one is used up once.
 */
export const submitVerifyEmailForm = createServerFn({ method: "POST" })
  .validator(
    (data: {
      state: string
      otp: string
      name?: string
      turnstileToken: string
      posthogSessionId?: string
    }) => data,
  )
  .handler(async ({ data }) => {
    const turnstileResult = await validateTurnstileToken(data.turnstileToken)
    if (!turnstileResult.success) {
      return { error: "Verification failed. Please try again." }
    }

    if (!data.state) {
      return { error: "Invalid verification attempt. Please try logging in again." }
    }

    const attempt = await readEmailAccountAttemptByStateToken(data.state)
    if (!attempt) {
      console.error("submitVerifyEmailForm: attempt not found")
      return { error: "Invalid verification attempt. Please try logging in again." }
    }
    if (attempt.consumed) {
      console.error("submitVerifyEmailForm: attempt already consumed", { attemptId: attempt.id })
      return { error: "This verification code is invalid/expired." }
    }
    // Checked before the code comparison, so an expired attempt can't be ground down.
    if (Date.now() > attempt.createdAt.getTime() + VERIFICATION_CODE_EXPIRY_SECONDS * 1000) {
      console.error("submitVerifyEmailForm: otp expired", { attemptId: attempt.id })
      return { error: "Verification code expired. Please try logging in again." }
    }

    // The checks above read the row before other guesses landed; these two decide atomically.
    const guesses = await admitEmailAccountAttemptGuess(attempt.id, VERIFICATION_CODE_MAX_ATTEMPTS)
    if (guesses === null) {
      console.error("submitVerifyEmailForm: no guesses left", { attemptId: attempt.id })
      return { error: "Too many incorrect codes. Please try logging in again." }
    }

    if (hashString(data.otp) !== attempt.codeHash) {
      console.error("submitVerifyEmailForm: otp mismatch", { attemptId: attempt.id, guesses })
      if (guesses >= VERIFICATION_CODE_MAX_ATTEMPTS) {
        await consumeEmailAccountAttempt(attempt.id)
        return { error: "Too many incorrect codes. Please try logging in again." }
      }
      return { error: "Invalid verification code. Please try again." }
    }

    if (!(await consumeEmailAccountAttempt(attempt.id))) {
      console.error("submitVerifyEmailForm: attempt consumed meanwhile", { attemptId: attempt.id })
      return { error: "This verification code is invalid/expired." }
    }

    const result = await findOrCreateAccountByEmail({ email: attempt.email, name: data.name })
    if ("error" in result) {
      return { error: result.error }
    }

    await setAuthCookie(result.account.id)
    captureLogin({
      accountId: result.account.id,
      method: "email_code",
      isNewAccount: result.isNewAccount,
      posthogSessionId: data.posthogSessionId,
    })
    return { success: true as const }
  })
