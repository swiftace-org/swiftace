import { createServerFn } from "@tanstack/react-start"

import { adminMiddleware } from "@/lib/utils"
import { clearSiteConfigCache } from "@/lib/utils.server"
import type { GeneralSettings } from "@/types/site-config"

import { upsertSiteConfigSection } from "../-lib/db.server"
import { toGeneralSettings } from "../-lib/utils"

export const submitGeneralSettings = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: { values: GeneralSettings }) => data)
  .handler(async ({ data }) => {
    const result = toGeneralSettings(data.values)
    if ("error" in result) return result

    try {
      await upsertSiteConfigSection("general", result.settings)
    } catch (error) {
      console.error("submitGeneralSettings: save failed", error)
      return { error: "Could not save the general settings. Please try again." }
    }
    clearSiteConfigCache()
    return { settings: result.settings }
  })
