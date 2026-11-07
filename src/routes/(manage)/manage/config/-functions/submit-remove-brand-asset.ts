import { createServerFn } from "@tanstack/react-start"

import { adminMiddleware } from "@/lib/utils"
import { clearSiteConfigCache, getSiteConfig } from "@/lib/utils.server"
import type { BrandAsset, BrandingSettings } from "@/types/site-config"

import { BRAND_ASSET_DETAILS } from "../-lib/constants"
import { mergeBrandingSettings } from "../-lib/db.server"

/**
 * Goes back to the default for one image. The object stays in R2: pages and link previews cached
 * with its URL keep working, and it's a few hundred KB at most.
 */
export const submitRemoveBrandAsset = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: { asset: BrandAsset }) => data)
  .handler(async ({ data }): Promise<{ branding: BrandingSettings } | { error: string }> => {
    if (!(data.asset in BRAND_ASSET_DETAILS)) return { error: "Unknown image." }

    try {
      await mergeBrandingSettings({ [data.asset]: "" })
    } catch (error) {
      console.error("submitRemoveBrandAsset: save failed", { asset: data.asset, error })
      return { error: "Could not remove the image. Please try again." }
    }
    clearSiteConfigCache()
    return { branding: (await getSiteConfig()).branding }
  })
