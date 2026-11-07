import { createServerFn } from "@tanstack/react-start"

import { adminMiddleware } from "@/lib/utils"
import { clearSiteConfigCache, getSiteConfig } from "@/lib/utils.server"
import type { ManageConfigPageData } from "@/types/site-config"

import { toAdminIntegrationSettings } from "../-lib/utils.server"

export const loadManageConfigPageData = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async (): Promise<ManageConfigPageData> => {
    // Read fresh, so the form never starts from a copy that's about to be overwritten.
    clearSiteConfigCache()
    const { general, branding, home, pricing, legal, integrations } = await getSiteConfig()
    return { general, branding, home, pricing, legal, ...toAdminIntegrationSettings(integrations) }
  })
