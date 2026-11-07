import { createFileRoute } from "@tanstack/react-router"

import { readReviewAvatar } from "./(manage)/manage/reviews/-lib/utils.server"

/** Reviewers' photos, from `reviews/` in R2. Keys are content-hashed, so a response never goes stale. */
export const Route = createFileRoute("/assets/reviews/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const image = await readReviewAvatar(`reviews/${params._splat ?? ""}`)
        if (!image?.Body) return new Response("Not found", { status: 404 })

        return new Response(image.Body.transformToWebStream(), {
          headers: {
            "Content-Type": image.ContentType ?? "application/octet-stream",
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-Content-Type-Options": "nosniff",
          },
        })
      },
    },
  },
})
