import { createServerFn } from "@tanstack/react-start"

import { adminMiddleware } from "@/lib/utils"
import { clearSiteConfigCache, getSiteConfig } from "@/lib/utils.server"
import type { BrandAsset, BrandingSettings } from "@/types/site-config"

import { BRAND_ASSET_DETAILS } from "../-lib/constants"
import { mergeBrandingSettings } from "../-lib/db.server"
import { detectBrandImageType, toBrandAssetError } from "../-lib/utils.server"
import { uploadBrandAsset } from "../../../../brand/-lib/utils.server"

/** Uploads one branding image and points the config at it. FormData, because it's a file. */
export const submitBrandAsset = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: FormData) => {
    if (!(data instanceof FormData)) throw new Error("Invalid upload.")
    return data
  })
  .handler(async ({ data }): Promise<{ branding: BrandingSettings } | { error: string }> => {
    const asset = data.get("asset")
    const file = data.get("file")
    if (typeof asset !== "string" || !(asset in BRAND_ASSET_DETAILS)) {
      return { error: "Unknown image." }
    }
    if (!(file instanceof File) || !file.size) return { error: "Choose a file to upload." }

    const bytes = new Uint8Array(await file.arrayBuffer())
    const type = detectBrandImageType(bytes)
    const error = await toBrandAssetError(asset as BrandAsset, bytes, type)
    if (error || !type) return { error: error ?? "That file isn't a supported image." }

    try {
      const key = await uploadBrandAsset(asset as BrandAsset, bytes, type)
      await mergeBrandingSettings({ [asset]: key })
    } catch (error) {
      console.error("submitBrandAsset: upload failed", { asset, error })
      return { error: "Could not upload the image. Please try again." }
    }
    clearSiteConfigCache()
    return { branding: (await getSiteConfig()).branding }
  })
