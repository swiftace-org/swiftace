import { createServerFn } from "@tanstack/react-start"

import { adminMiddleware } from "@/lib/utils"
import { clearSiteConfigCache, getSiteConfig } from "@/lib/utils.server"
import type { IntegrationSettings } from "@/types/site-config"

import { upsertSiteConfigSection } from "../-lib/db.server"
import { toAdminIntegrationSettings, toIntegrationSettings } from "../-lib/utils.server"

export const submitIntegrationSettings = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: { values: IntegrationSettings }) => data)
  .handler(async ({ data }) => {
    // Fresh, because a blank secret in the form means "keep the saved one".
    clearSiteConfigCache()
    const stored = (await getSiteConfig()).integrations
    const result = toIntegrationSettings(data.values, stored)
    if ("error" in result) return result

    try {
      await upsertSiteConfigSection("integrations", result.settings)
    } catch (error) {
      console.error("submitIntegrationSettings: save failed", error)
      return { error: "Could not save the integrations. Please try again." }
    }
    clearSiteConfigCache()
    // Masked again on the way back, so a secret typed into the form never comes back down.
    return toAdminIntegrationSettings(result.settings)
  })
