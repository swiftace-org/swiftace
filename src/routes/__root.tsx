import interWoff2 from "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url"
import { TanStackDevtools } from "@tanstack/react-devtools"
import {
  type AnyRouteMatch,
  Outlet,
  createRootRoute,
  useRouteContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { useEffect, useRef } from "react"
import { ThemeProvider } from "tanstack-router-theme-provider"

import { Toaster } from "@/components/ui/toast"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  getSiteOrigin,
  loadCurrentSession,
  revalidateSession,
  seedSessionCache,
  toAbsoluteUrl,
  toJsonLdScript,
  toOrganizationJsonLd,
  toSocialImageMeta,
} from "@/lib/utils"
import type { PublicSiteConfig } from "@/types/site-config"

import { PostHogAnalytics } from "./-components/posthog-analytics"

import appCss from "@/styles.css?url"

export const Route = createRootRoute({
  beforeLoad: () => loadCurrentSession(),
  head: ({ match }) => {
    const siteConfig = match.context.siteConfig as PublicSiteConfig | undefined
    // Versioned, so a new icon shows up without waiting out these paths' hour of caching.
    const version = `?v=${siteConfig?.branding.iconVersion ?? "default"}`
    const faviconVersion = `?v=${siteConfig?.branding.faviconVersion ?? "default"}`
    const links: AnyRouteMatch["links"] = [
      { rel: "stylesheet", href: appCss },
      {
        rel: "icon",
        href: `/favicon.ico${faviconVersion}`,
        type: "image/x-icon",
        sizes: "16x16 32x32 48x48",
      },
      { rel: "icon", href: `/icon-192.png${version}`, type: "image/png", sizes: "192x192" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: `/apple-touch-icon.png${version}` },
      {
        rel: "preload",
        as: "font",
        type: "font/woff2",
        href: interWoff2,
        crossOrigin: "anonymous",
      },
    ]
    const baseMeta: AnyRouteMatch["meta"] = [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
    ]
    // Missing only when `beforeLoad` failed, and the error page still needs its stylesheet.
    if (!siteConfig) return { meta: baseMeta, links }
    const { general, branding } = siteConfig

    const title = `${general.tagline} — ${general.siteName}`
    return {
      meta: [
        ...baseMeta,
        // Site-wide defaults; a page's own `toPageHead` overrides each of these by name.
        { title },
        { name: "description", content: general.description },
        { property: "og:site_name", content: general.siteName },
        { property: "og:type", content: "website" },
        { property: "og:title", content: title },
        { property: "og:description", content: general.description },
        ...toSocialImageMeta(branding.socialImageUrl && toAbsoluteUrl(branding.socialImageUrl)),
      ],
      scripts: [
        toJsonLdScript(toOrganizationJsonLd(siteConfig)),
        toJsonLdScript({
          "@type": "WebSite",
          "@id": `${getSiteOrigin()}/#website`,
          name: general.siteName,
          url: getSiteOrigin(),
          publisher: { "@id": `${getSiteOrigin()}/#organization` },
        }),
      ],
      links,
    }
  },
  shellComponent: RootDocument,
})

/**
 * Keeps the browser's session cache honest: seeded from the context the server rendered, then
 * refetched behind every navigation rather than blocking it. Its own component so a session
 * change re-renders this and not the whole document.
 */
function SessionCacheSeed() {
  const router = useRouter()
  const href = useRouterState({ select: (state) => state.location.href })
  const isFirstLoad = useRef(true)
  seedSessionCache(useRouteContext({ from: "__root__" }))

  useEffect(() => {
    // The first page load's session came from the server moments ago — nothing to revalidate.
    if (isFirstLoad.current) {
      isFirstLoad.current = false
      return
    }
    void revalidateSession(router)
  }, [href, router])

  return null
}

function RootDocument() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>
          <TooltipProvider>
            <SessionCacheSeed />
            <PostHogAnalytics />
            <Outlet />
            <Toaster />
            <TanStackDevtools
              config={{
                position: "bottom-right",
              }}
              plugins={[
                {
                  name: "Tanstack Router",
                  render: <TanStackRouterDevtoolsPanel />,
                },
              ]}
            />
            <Scripts />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
