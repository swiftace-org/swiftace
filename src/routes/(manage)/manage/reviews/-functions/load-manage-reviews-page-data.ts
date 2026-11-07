import { createServerFn } from "@tanstack/react-start"

import { adminMiddleware } from "@/lib/utils"

import { readReviewsForAdmin } from "../-lib/db.server"

export const loadManageReviewsPageData = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async () => ({ reviews: await readReviewsForAdmin() }))
