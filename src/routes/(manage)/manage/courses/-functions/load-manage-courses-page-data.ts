import { createServerFn } from "@tanstack/react-start"

import { adminMiddleware } from "@/lib/utils"

import { readCoursesForAdmin } from "../-lib/db.server"

export const loadManageCoursesPageData = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async () => ({ courses: await readCoursesForAdmin() }))
