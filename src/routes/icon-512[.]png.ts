import { createFileRoute } from "@tanstack/react-router"

import { BRAND_ICON_CACHE_CONTROL } from "./brand/-lib/constants"
import { readIconPng } from "./brand/-lib/utils.server"

/** The largest icon the manifest and search engines ask for. */
export const Route = createFileRoute("/icon-512.png")({
  server: {
    handlers: {
      GET: async () =>
        new Response(await readIconPng(512), {
          headers: { "Content-Type": "image/png", "Cache-Control": BRAND_ICON_CACHE_CONTROL },
        }),
    },
  },
})
