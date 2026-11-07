import { createFileRoute } from "@tanstack/react-router"

import { BRAND_ICON_CACHE_CONTROL } from "./brand/-lib/constants"
import { readFaviconIco } from "./brand/-lib/utils.server"

/** The uploaded favicon, or one built from the icon. Browsers ask for this path whatever a page links. */
export const Route = createFileRoute("/favicon.ico")({
  server: {
    handlers: {
      GET: async () =>
        new Response(await readFaviconIco(), {
          headers: { "Content-Type": "image/x-icon", "Cache-Control": BRAND_ICON_CACHE_CONTROL },
        }),
    },
  },
})
