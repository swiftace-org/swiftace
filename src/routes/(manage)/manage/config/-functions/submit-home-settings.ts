import { createServerFn } from "@tanstack/react-start"

import { adminMiddleware } from "@/lib/utils"
import { clearSiteConfigCache } from "@/lib/utils.server"
import type { HomeSettings } from "@/types/site-config"

import { upsertSiteConfigSection } from "../-lib/db.server"
import { toHomeSettings } from "../-lib/utils"

export const submitHomeSettings = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: { values: HomeSettings }) => data)
  .handler(async ({ data }) => {
    const result = toHomeSettings(data.values)
    if ("error" in result) return result

    try {
      await upsertSiteConfigSection("home", result.settings)
    } catch (error) {
      console.error("submitHomeSettings: save failed", error)
      return { error: "Could not save the home page settings. Please try again." }
    }
    clearSiteConfigCache()
    return { settings: result.settings }
  })
