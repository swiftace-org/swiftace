import { createFileRoute } from "@tanstack/react-router"

import { readLegacyCourseImage } from "./-lib/utils.server"

/**
 * Images the legacy course editor uploaded, which older covers still point at. New uploads go to
 * `/assets/course-images/$`. Every legacy upload got a fresh key, so a response never goes stale.
 */
export const Route = createFileRoute("/course/$courseSlug_/images/$hash/$filename")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const image = await readLegacyCourseImage(params.courseSlug, params.hash, params.filename)
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
