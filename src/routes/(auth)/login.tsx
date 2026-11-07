import { Outlet, createFileRoute, redirect } from "@tanstack/react-router"

import { Navbar } from "@/components/navbar"
import { ROBOTS_NOINDEX_META } from "@/lib/config"

import { HomeFooter } from "../-components/home-footer"
import { sanitizeNextUrl } from "./-lib/utils"

type LoginSearch = { next?: string }

export const Route = createFileRoute("/(auth)/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    next: sanitizeNextUrl(search.next),
  }),
  beforeLoad: ({ context, search }) => {
    if (context.account) {
      throw redirect({ href: search.next ?? "/" })
    }
  },
  head: ({ match }) => ({
    meta: [{ title: `Log in — ${match.context.siteConfig.general.siteName}` }, ROBOTS_NOINDEX_META],
  }),
  component: LoginLayout,
})

function LoginLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      <Navbar account={null} />
      <Outlet />
      <HomeFooter />
    </div>
  )
}
