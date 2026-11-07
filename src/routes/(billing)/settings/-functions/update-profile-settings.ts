import { createServerFn } from "@tanstack/react-start"

import { ACCOUNT_NAME_MAX_LENGTH } from "@/lib/config"
import { authMiddleware } from "@/lib/utils"

import { updateAccountName } from "../-lib/db.server"

export const submitProfileSettingsForm = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { name: string }) => data)
  .handler(async ({ data, context }) => {
    const name = data.name.trim()
    if (!name) {
      return { error: "Full name cannot be empty." }
    }
    if (name.length > ACCOUNT_NAME_MAX_LENGTH) {
      return { error: `Full name must be at most ${ACCOUNT_NAME_MAX_LENGTH} characters.` }
    }

    await updateAccountName(context.account.id, name)
    return { name }
  })
