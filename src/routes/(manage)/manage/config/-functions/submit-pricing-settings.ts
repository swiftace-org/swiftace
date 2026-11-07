import { createServerFn } from "@tanstack/react-start"

import { adminMiddleware } from "@/lib/utils"
import { clearSiteConfigCache } from "@/lib/utils.server"
import type { PricingSettings } from "@/types/site-config"

import { upsertSiteConfigSection } from "../-lib/db.server"
import { toPricingSettings } from "../-lib/utils"

export const submitPricingSettings = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: { values: PricingSettings }) => data)
  .handler(async ({ data }) => {
    const result = toPricingSettings(data.values)
    if ("error" in result) return result

    try {
      await upsertSiteConfigSection("pricing", result.settings)
    } catch (error) {
      console.error("submitPricingSettings: save failed", error)
      return { error: "Could not save the pricing settings. Please try again." }
    }
    clearSiteConfigCache()
    return { settings: result.settings }
  })
