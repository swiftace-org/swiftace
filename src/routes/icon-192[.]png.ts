import { createFileRoute } from "@tanstack/react-router"

import { BRAND_ICON_CACHE_CONTROL } from "./brand/-lib/constants"
import { readIconPng } from "./brand/-lib/utils.server"

/** The icon at the size manifests, emails and the navbar use. */
export const Route = createFileRoute("/icon-192.png")({
  server: {
    handlers: {
      GET: async () =>
        new Response(await readIconPng(192), {
          headers: { "Content-Type": "image/png", "Cache-Control": BRAND_ICON_CACHE_CONTROL },
        }),
    },
  },
})
