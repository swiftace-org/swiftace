import { useRouteContext } from "@tanstack/react-router"
import * as React from "react"

import { getCachedSiteConfig } from "@/lib/utils"
import type { PublicSiteConfig } from "@/types/site-config"

const MOBILE_BREAKPOINT = 768
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribeToMobileQuery,
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false,
  )
}

/** False on the server and during hydration, true after — for markup only the browser renders. */
export function useIsClient() {
  return React.useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  )
}

/** `/manage/config`, from the root context — or the tab's copy while a navigation blanks it. */
export function useSiteConfig(): PublicSiteConfig {
  const { siteConfig } = useRouteContext({ from: "__root__" })
  const config = siteConfig ?? getCachedSiteConfig()
  if (!config) throw new Error("useSiteConfig: the root context has no site config yet.")
  return config
}

function subscribeToMobileQuery(onChange: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

function subscribeToNothing() {
  return () => {}
}
