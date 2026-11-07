import { createFileRoute } from "@tanstack/react-router"

import { getSiteUrl } from "@/lib/utils.server"

import { CRAWLER_FILE_CACHE_CONTROL } from "./-lib/constants"

/** Pages crawlers have no business fetching. Gated pages carry `noindex` instead: a crawler
 * that's disallowed never sees that tag, and may list the bare URL anyway. */
const DISALLOWED_PATHS = [
  "/api/",
  "/login",
  "/signup",
  "/settings",
  "/manage",
  "/course/*/manage",
  "/pricing/complete",
  "/github/auth",
  "/google/auth",
  "/status",
]

/** Served rather than static so the `Sitemap` line, which must be absolute, follows the host. */
export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () => {
        const body = [
          "User-agent: *",
          ...DISALLOWED_PATHS.map((path) => `Disallow: ${path}`),
          "",
          `Sitemap: ${getSiteUrl()}/sitemap.xml`,
          "",
        ].join("\n")
        return new Response(body, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": CRAWLER_FILE_CACHE_CONTROL,
          },
        })
      },
    },
  },
})
