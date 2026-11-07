import { createFileRoute } from "@tanstack/react-router"

import { readBrandAsset } from "./brand/-lib/utils.server"

/** The images uploaded in `/manage/config`, from `brand/` in R2. Keys are content-hashed, so a response never goes stale. */
export const Route = createFileRoute("/_brand/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const image = await readBrandAsset(`brand/${params._splat ?? ""}`)
        if (!image?.Body) return new Response("Not found", { status: 404 })

        return new Response(image.Body.transformToWebStream(), {
          headers: {
            "Content-Type": image.ContentType ?? "application/octet-stream",
            "Cache-Control": "public, max-age=31536000, immutable",
            // Opened directly, an SVG runs its scripts as this origin; the sandbox stops that.
            "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
            "X-Content-Type-Options": "nosniff",
          },
        })
      },
    },
  },
})
