import { Link, useLocation } from "@tanstack/react-router"
import { HomeIcon, PanelLeftIcon, PanelRightIcon } from "lucide-react"

import { IconButton } from "@/components/icon-button"
import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { UserMenu } from "@/components/user-menu"
import { useSiteConfig } from "@/lib/hooks"
import type { Account } from "@/types/account"
import type { AdminCourseDetails } from "@/types/course"

type SidebarToggleGroup = {
  leftOpen: boolean
  onToggleLeft: () => void
  rightOpen: boolean
  onToggleRight: () => void
}

export function ManageNavbar({
  account,
  course,
  desktopSidebar,
  mobileSidebar,
}: {
  account: Account | null
  course: AdminCourseDetails
  desktopSidebar: SidebarToggleGroup
  mobileSidebar: SidebarToggleGroup
}) {
  const next = useLocation({ select: (location) => location.href })
  const { general, branding } = useSiteConfig()
  const { slug, title } = course
  return (
    <div className="flex items-center justify-between border-b px-2 shrink-0 py-1">
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
          tooltip="Toggle manage sidebar"
          className="hidden md:inline-flex"
          aria-expanded={desktopSidebar.leftOpen}
          onClick={desktopSidebar.onToggleLeft}
        >
          <PanelLeftIcon className="size-5" />
        </IconButton>
        <IconButton
          tooltip="Toggle manage sidebar"
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
        {/* Hidden until the right sidebar has something in it — the toggles and their
            state are kept wired up so re-enabling is a matter of dropping `hidden`. */}
        <IconButton
          tooltip="Toggle right sidebar"
          className="hidden"
          aria-expanded={desktopSidebar.rightOpen}
          onClick={desktopSidebar.onToggleRight}
        >
          <PanelRightIcon className="size-5" />
        </IconButton>
        <IconButton
          tooltip="Toggle right sidebar"
          className="hidden"
          aria-expanded={mobileSidebar.rightOpen}
          onClick={mobileSidebar.onToggleRight}
        >
          <PanelRightIcon className="size-5" />
        </IconButton>
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
