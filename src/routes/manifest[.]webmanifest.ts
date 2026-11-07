import { createFileRoute } from "@tanstack/react-router"

import { getSiteConfig, toPublicSiteConfig } from "@/lib/utils.server"

import { BRAND_ICON_CACHE_CONTROL } from "./brand/-lib/constants"

/** Served rather than static so the name and icons follow `/manage/config`. */
export const Route = createFileRoute("/manifest.webmanifest")({
  server: {
    handlers: {
      GET: async () => {
        const { general, branding } = toPublicSiteConfig(await getSiteConfig())
        const version = `?v=${branding.iconVersion}`
        const manifest = {
          name: general.siteName,
          short_name: general.siteName,
          description: general.description,
          start_url: "/",
          scope: "/",
          display: "standalone",
          background_color: "#ffffff",
          theme_color: "#ffffff",
          icons: [
            { src: `/icon-192.png${version}`, sizes: "192x192", type: "image/png" },
            { src: `/icon-512.png${version}`, sizes: "512x512", type: "image/png" },
          ],
        }
        return new Response(JSON.stringify(manifest), {
          headers: {
            "Content-Type": "application/manifest+json",
            "Cache-Control": BRAND_ICON_CACHE_CONTROL,
          },
        })
      },
    },
  },
})
