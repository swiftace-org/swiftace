import { createServerFn } from "@tanstack/react-start"

import { authMiddleware } from "@/lib/utils"

import { readUserDeletionPreview } from "../../../(manage)/manage/users/$userId/-lib/utils.server"

export const loadDeleteAccountPreview = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) =>
    readUserDeletionPreview(context.account, context.account.id, true),
  )
