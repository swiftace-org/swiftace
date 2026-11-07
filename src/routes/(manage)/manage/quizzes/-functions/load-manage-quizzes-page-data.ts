import { createServerFn } from "@tanstack/react-start"

import { adminMiddleware } from "@/lib/utils"

import { readQuizzesForAdmin } from "../-lib/db.server"

export const loadManageQuizzesPageData = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async () => ({ quizzes: await readQuizzesForAdmin() }))
