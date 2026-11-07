import { createServerFn } from "@tanstack/react-start"

import { readAccountById } from "@/lib/db.server"
import { adminMiddleware } from "@/lib/utils"

import { deleteUserAccount } from "../-lib/utils.server"

export const submitDeleteUser = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: { userId: number; sendEmail: boolean }) => data)
  .handler(async ({ data, context }) => {
    const account = Number.isSafeInteger(data.userId) ? await readAccountById(data.userId) : null
    if (!account) return { error: "User not found." }

    return deleteUserAccount({
      account,
      currentAccountId: context.account.id,
      sendEmail: data.sendEmail,
    })
  })
