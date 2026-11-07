import { createServerFn } from "@tanstack/react-start"

import {
  readEmailAccountAttemptByTokenHash,
  updateEmailAccountAttemptConsumed,
} from "../-lib/db.server"
import { VERIFICATION_CODE_EXPIRY_SECONDS } from "../../-lib/constants"
import {
  captureLogin,
  findOrCreateAccountByEmail,
  hashString,
  setAuthCookie,
} from "../../-lib/utils.server"

export const verifyMagicLinkToken = createServerFn({ method: "POST" })
  .validator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    const attempt = await readEmailAccountAttemptByTokenHash(hashString(data.token))

    if (!attempt) {
      console.error("verifyMagicLinkToken: no attempt for token")
      return { error: "Invalid verification link. Please try logging in again." }
    }
    if (attempt.consumed) {
      console.error("verifyMagicLinkToken: attempt already consumed", { attemptId: attempt.id })
      return { error: "This verification link has already been used." }
    }
    if (Date.now() > attempt.createdAt.getTime() + VERIFICATION_CODE_EXPIRY_SECONDS * 1000) {
      console.error("verifyMagicLinkToken: token expired", { attemptId: attempt.id })
      return { error: "Verification link expired. Please request a new one." }
    }

    await updateEmailAccountAttemptConsumed(attempt.id, true)

    const result = await findOrCreateAccountByEmail({
      email: attempt.email,
      name: attempt.email.split("@")[0],
    })
    if ("error" in result) {
      return { error: result.error }
    }

    await setAuthCookie(result.account.id)
    captureLogin({
      accountId: result.account.id,
      method: "magic_link",
      isNewAccount: result.isNewAccount,
    })
    return { success: true as const }
  })
