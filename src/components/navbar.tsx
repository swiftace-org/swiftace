import { Link, useLocation, useRouteContext } from "@tanstack/react-router"

import { ModeToggle } from "@/components/mode-toggle"
import { ProBadge } from "@/components/pro-badge"
import { SiteLogo } from "@/components/site-logo"
import { Button } from "@/components/ui/button"
import { UpgradeButton } from "@/components/upgrade-button"
import { UserMenu } from "@/components/user-menu"
import { useSiteConfig } from "@/lib/hooks"
import type { Account } from "@/types/account"

/**
 * `hasActiveSubscription` comes from the root context, not a prop: seventeen call sites would
 * otherwise have to thread it, and forgetting shows a paying subscriber an Upgrade button.
 * `account` stays a prop, because `/login` renders the signed-out navbar regardless.
 */
export function Navbar({ account }: { account: Account | null }) {
  const next = useLocation({ select: (location) => location.href })
  const { hasActiveSubscription } = useRouteContext({ from: "__root__" })
  const { general, integrations } = useSiteConfig()
  const siteName = general.siteName

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 px-2 py-1 backdrop-blur">
      {/* Height, padding and spacing deliberately mirror CourseNavbar/ManageNavbar so
          navigating between the home page and a course doesn't shift the bar. */}
      <div className="flex items-center justify-between">
        <Link aria-label={`${siteName} home`} className="flex items-center gap-2" to="/">
          <span className="sr-only">{siteName}</span>
          <SiteLogo size="sm" iconOnlyBelowSm />
        </Link>
        <div className="flex items-center gap-1">
          {account &&
            integrations.billing.enabled &&
            (hasActiveSubscription ? <ProBadge linkToPricing /> : <UpgradeButton />)}
          <ModeToggle />
          {account ? (
            <UserMenu account={account} />
          ) : (
            <Button
              render={
                <Link to="/login" search={{ next }}>
                  Log In
                </Link>
              }
              nativeButton={false}
              variant="outline"
              size="sm"
            />
          )}
        </div>
      </div>
    </header>
  )
}
