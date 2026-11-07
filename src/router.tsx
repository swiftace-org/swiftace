import { createRouter as createTanStackRouter } from "@tanstack/react-router"

import { RoutePendingFallback } from "@/components/route-pending-fallback"

import { captureClientException } from "./routes/-lib/utils"
import { routeTree } from "./routeTree.gen"

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    // Wait 200ms before showing a pending UI, then show it for at least 300ms
    // so quick navigations don't flash a skeleton.
    defaultPendingMs: 200,
    defaultPendingMinMs: 300,
    defaultPendingComponent: RoutePendingFallback,
    defaultOnCatch: (error) => captureClientException(error),
  })

  return router
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
