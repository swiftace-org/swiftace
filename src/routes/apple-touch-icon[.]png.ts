import { createFileRoute } from "@tanstack/react-router"

import { BRAND_ICON_CACHE_CONTROL } from "./brand/-lib/constants"
import { readIconPng } from "./brand/-lib/utils.server"

/** What iOS puts on the home screen, on white, since it renders transparency black. */
export const Route = createFileRoute("/apple-touch-icon.png")({
  server: {
    handlers: {
      GET: async () =>
        new Response(await readIconPng(180, { opaque: true }), {
          headers: { "Content-Type": "image/png", "Cache-Control": BRAND_ICON_CACHE_CONTROL },
        }),
    },
  },
})
