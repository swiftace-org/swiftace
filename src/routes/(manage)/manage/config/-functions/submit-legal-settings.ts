import { createServerFn } from "@tanstack/react-start"

import { adminMiddleware } from "@/lib/utils"
import { clearSiteConfigCache } from "@/lib/utils.server"
import type { LegalSettings } from "@/types/site-config"

import { upsertSiteConfigSection } from "../-lib/db.server"
import { toLegalSettings } from "../-lib/utils"

export const submitLegalSettings = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: { values: LegalSettings }) => data)
  .handler(async ({ data }) => {
    const result = toLegalSettings(data.values)
    if ("error" in result) return result

    try {
      await upsertSiteConfigSection("legal", result.settings)
    } catch (error) {
      console.error("submitLegalSettings: save failed", error)
      return { error: "Could not save the legal pages. Please try again." }
    }
    clearSiteConfigCache()
    return { settings: result.settings }
  })
