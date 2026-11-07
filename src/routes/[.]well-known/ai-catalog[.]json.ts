import { createFileRoute } from "@tanstack/react-router"

import { getSiteConfig, getSiteUrl, toPublicSiteConfig } from "@/lib/utils.server"

import { CRAWLER_FILE_CACHE_CONTROL } from "../-lib/constants"

/**
 * The draft AI Catalog (ai-catalog.io): which agent-facing artifacts this domain publishes. There
 * are no MCP servers or agents yet, so it only names the host and points at llms.txt.
 */
export const Route = createFileRoute("/.well-known/ai-catalog.json")({
  server: {
    handlers: {
      GET: async () => {
        const origin = getSiteUrl()
        const { general, branding } = toPublicSiteConfig(await getSiteConfig())
        const domain = new URL(origin).hostname
        return Response.json(
          {
            specVersion: "1.0",
            host: {
              displayName: general.siteName,
              identifier: domain,
              documentationUrl: `${origin}/llms.txt`,
              logoUrl: `${origin}/icon-512.png?v=${branding.iconVersion}`,
            },
            entries: [
              {
                identifier: `urn:air:${domain}:llms-txt:site`,
                type: "text/markdown",
                url: `${origin}/llms.txt`,
                displayName: `${general.siteName} site map for language models`,
                description: "Every public course and the lessons readable without signing in.",
              },
            ],
          },
          {
            headers: {
              "Content-Type": "application/ai-catalog+json",
              "Cache-Control": CRAWLER_FILE_CACHE_CONTROL,
            },
          },
        )
      },
    },
  },
})
