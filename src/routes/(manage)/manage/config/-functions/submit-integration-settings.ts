import { createServerFn } from "@tanstack/react-start"

import { adminMiddleware } from "@/lib/utils"
import { clearSiteConfigCache, getSiteConfig, getSiteUrl } from "@/lib/utils.server"
import type { IntegrationSettings } from "@/types/site-config"

import { mergeIntegrationSettings } from "../-lib/db.server"
import { toAdminIntegrationSettings, toIntegrationSettings } from "../-lib/utils.server"

export const submitIntegrationSettings = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: { values: Partial<IntegrationSettings> }) => data)
  .handler(async ({ data }) => {
    try {
      // A blank secret keeps its saved value; omitted sections keep their current settings.
      clearSiteConfigCache()
      const stored = (await getSiteConfig()).integrations
      const result = toIntegrationSettings(data.values, stored, getSiteUrl())
      if ("error" in result) return result
      await mergeIntegrationSettings(
        Object.fromEntries(
          Object.entries(result.settings).filter(([key]) => Object.hasOwn(data.values, key)),
        ),
      )
      clearSiteConfigCache()
      return toAdminIntegrationSettings(result.settings)
    } catch {
      // Database errors can include query parameters containing the submitted credentials.
      console.error("submitIntegrationSettings: save failed")
      return { error: "Could not save the integrations. Please try again." }
    }
  })
