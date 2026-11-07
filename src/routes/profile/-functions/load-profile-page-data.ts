import { createServerFn } from "@tanstack/react-start"

import { authMiddleware } from "@/lib/utils"

import { readCertificatesByAccountId } from "../-lib/db.server"

export const loadProfilePageData = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => ({
    certificates: await readCertificatesByAccountId(context.account.id),
  }))
