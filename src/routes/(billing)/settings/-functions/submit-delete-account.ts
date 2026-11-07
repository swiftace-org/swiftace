import { createServerFn } from "@tanstack/react-start"

import { authMiddleware } from "@/lib/utils"
import { clearAuthCookie } from "@/lib/utils.server"

import { deleteUserAccount } from "../../../(manage)/manage/users/$userId/-lib/utils.server"

export const submitDeleteAccount = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { confirmation: string }) => data)
  .handler(async ({ data, context }) => {
    const { account } = context
    if (
      typeof data.confirmation !== "string" ||
      data.confirmation.trim().toLowerCase() !== account.email.toLowerCase()
    ) {
      return { error: "Type your email address to confirm deletion." }
    }
    const result = await deleteUserAccount({
      account,
      currentAccountId: account.id,
      sendEmail: true,
      selfService: true,
    })
    if (!("error" in result)) clearAuthCookie()
    return result
  })
