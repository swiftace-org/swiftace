import { Link, useLocation, useRouteContext } from "@tanstack/react-router"
import { BotIcon, HomeIcon, PanelLeftIcon } from "lucide-react"

import { IconButton } from "@/components/icon-button"
import { ModeToggle } from "@/components/mode-toggle"
import { ProBadge } from "@/components/pro-badge"
import { Button } from "@/components/ui/button"
import { UpgradeButton } from "@/components/upgrade-button"
import { UserMenu } from "@/components/user-menu"
import { useSiteConfig } from "@/lib/hooks"
import type { Account } from "@/types/account"
import type { CourseDisplay } from "@/types/course"

type SidebarToggleGroup = {
  leftOpen: boolean
  onToggleLeft: () => void
  rightOpen: boolean
  onToggleRight: () => void
}

export function CourseNavbar({
  account,
  course,
  desktopSidebar,
  mobileSidebar,
}: {
  account: Account | null
  course: CourseDisplay
  desktopSidebar: SidebarToggleGroup
  mobileSidebar: SidebarToggleGroup
}) {
  const next = useLocation({ select: (location) => location.href })
  const { hasActiveSubscription } = useRouteContext({ from: "__root__" })
  const { general, branding, integrations, aiTutor } = useSiteConfig()
  const { slug, title } = course
  return (
    <div className="relative flex items-center justify-between border-b px-2 shrink-0 py-1">
      <div className="flex items-center gap-1">
        <IconButton
          tooltip="Home"
          render={
            <Link to="/">
              <HomeIcon className="size-5" />
            </Link>
          }
          nativeButton={false}
        />
        <IconButton
          tooltip="Toggle course sidebar"
          className="hidden md:inline-flex"
          aria-expanded={desktopSidebar.leftOpen}
          onClick={desktopSidebar.onToggleLeft}
        >
          <PanelLeftIcon className="size-5" />
        </IconButton>
        <IconButton
          tooltip="Toggle course sidebar"
          className="md:hidden"
          aria-expanded={mobileSidebar.leftOpen}
          onClick={mobileSidebar.onToggleLeft}
        >
          <PanelLeftIcon className="size-5" />
        </IconButton>
      </div>

      <div className="hidden sm:flex absolute left-1/2 -translate-x-1/2 items-center justify-center gap-2 max-w-md px-2 font-medium text-lg">
        <img
          alt={`${general.siteName} icon`}
          className="h-5 w-5 shrink-0 rounded"
          height={20}
          src={branding.iconUrl}
          width={20}
        />
        <Link
          className="text-foreground/80 hover:text-foreground transition-colors truncate"
          to="/course/$courseSlug"
          params={{ courseSlug: slug }}
        >
          {title}
        </Link>
      </div>

      <div className="flex items-center gap-1">
        {account &&
          integrations.billing.enabled &&
          (hasActiveSubscription ? (
            <ProBadge linkToPricing />
          ) : (
            <UpgradeButton courseSlug={slug} />
          ))}
        {aiTutor.enabled && (
          <>
            {/* The open panel has a close button of its own. */}
            {!desktopSidebar.rightOpen && (
              <IconButton
                tooltip={`Ask ${aiTutor.name}`}
                className="hidden md:inline-flex"
                aria-expanded={false}
                onClick={desktopSidebar.onToggleRight}
              >
                <BotIcon className="size-5" />
              </IconButton>
            )}
            <IconButton
              tooltip={`Ask ${aiTutor.name}`}
              className="md:hidden"
              aria-expanded={mobileSidebar.rightOpen}
              onClick={mobileSidebar.onToggleRight}
            >
              <BotIcon className="size-5" />
            </IconButton>
          </>
        )}
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
  )
}
