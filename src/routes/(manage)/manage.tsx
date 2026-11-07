import { Outlet, createFileRoute, notFound, redirect } from "@tanstack/react-router"

import { Navbar } from "@/components/navbar"
import { ROBOTS_NOINDEX_META } from "@/lib/config"

export const Route = createFileRoute("/(manage)/manage")({
  head: () => ({ meta: [ROBOTS_NOINDEX_META] }),
  beforeLoad: ({ context, location }) => {
    if (!context.account) {
      throw redirect({ to: "/login", search: { next: location.href } })
    }
    if (!context.account.isAdmin) {
      throw notFound()
    }
    return { account: context.account }
  },
  component: ManageLayout,
})

/** The admin area's guard and chrome, so every page under `/manage` inherits both. */
function ManageLayout() {
  const { account } = Route.useRouteContext()

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      <Navbar account={account} />
      <Outlet />
    </div>
  )
}
