import type { BrandAsset } from "@/types/site-config"

export type BrandImageType = "png" | "jpg" | "webp" | "svg" | "ico"

export const BRAND_IMAGE_CONTENT_TYPES: Record<BrandImageType, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
}

/** The first part of each upload's R2 key, as in `brand/logo-light-3fa9c2e1b07d.svg`. */
export const BRAND_ASSET_KEY_NAMES: Record<BrandAsset, string> = {
  icon: "icon",
  favicon: "favicon",
  logoLight: "logo-light",
  logoDark: "logo-dark",
  socialImage: "social-image",
  courseCover: "course-cover",
  aiTutorAvatar: "ai-tutor-avatar",
}

/** Also what the `/brand/$` route accepts, so it can't be pointed at anything else in the bucket. */
export const BRAND_ASSET_KEY_PATTERN = /^brand\/[a-z-]+-[0-9a-f]{12}\.(png|jpg|webp|svg|ico)$/

/** Fixed paths that browsers and crawlers ask for by name, so they can't carry a content hash. */
export const BRAND_ICON_CACHE_CONTROL = "public, max-age=3600"
