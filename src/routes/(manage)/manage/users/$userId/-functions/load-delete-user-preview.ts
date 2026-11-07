import { createServerFn } from "@tanstack/react-start"

import { readAccountById } from "@/lib/db.server"
import { adminMiddleware } from "@/lib/utils"

import { readUserDeletionPreview } from "../-lib/utils.server"

export const loadDeleteUserPreview = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .validator((data: { userId: number }) => data)
  .handler(async ({ data, context }) => {
    const account = Number.isSafeInteger(data.userId) ? await readAccountById(data.userId) : null
    if (!account) return { error: "User not found." }
    return readUserDeletionPreview(account, context.account.id)
  })
