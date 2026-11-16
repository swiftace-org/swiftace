import { createServerFn } from "@tanstack/react-start"

import { adminMiddleware } from "@/lib/utils"
import { clearSiteConfigCache } from "@/lib/utils.server"
import type { UpdateSettings } from "@/types/updates"

import { upsertSiteConfigSection } from "../-lib/db.server"

export const submitUpdateSettings = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: { values: UpdateSettings }) => data)
  .handler(async ({ data }) => {
    const settings: UpdateSettings = { autoUpdate: data.values.autoUpdate === true }
    try {
      await upsertSiteConfigSection("updates", settings)
    } catch (error) {
      console.error("submitUpdateSettings: save failed", error)
      return { error: "Could not save the update settings. Please try again." }
    }
    clearSiteConfigCache()
    return { settings }
  })
