import { createServerFn } from "@tanstack/react-start"

import { readAccountByEmail } from "@/lib/db.server"
import { normalizeEmail } from "@/lib/utils"

import { readEmailAccountAttemptByStateToken } from "../-lib/db.server"
import { maskEmail } from "../-lib/utils"

/**
 * Rehydrates the verify page from the opaque `state` param, so the flow can resume in a new tab.
 * `state` is the attempt's `state_token`, not its id: this endpoint can't require a session, so the
 * handle must be unguessable, and the address comes back masked since `state` leaks into history.
 */
export const loadAttemptFromState = createServerFn({ method: "GET" })
  .validator((data: { state: string }) => data)
  .handler(async ({ data }) => {
    // A blank token would otherwise match the legacy rows, whose `state_token` is NULL.
    if (!data.state) return null

    const attempt = await readEmailAccountAttemptByStateToken(data.state)
    if (!attempt) return null

    const account = await readAccountByEmail(normalizeEmail(attempt.email))

    return {
      maskedEmail: maskEmail(attempt.email),
      createdAtMs: attempt.createdAt.getTime(),
      hasAccount: !!account,
    }
  })
