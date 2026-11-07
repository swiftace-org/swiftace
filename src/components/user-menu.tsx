import { Link, useRouter } from "@tanstack/react-router"
import { CreditCard, House, LifeBuoy, LogOut, Settings, Shield, User } from "lucide-react"
import { useState } from "react"

import { SupportDialog } from "@/components/support-dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSiteConfig } from "@/lib/hooks"
import { getInitials, refreshSession } from "@/lib/utils"
import { logout } from "@/routes/-functions/logout"
import type { Account } from "@/types/account"

export function UserMenu({ account }: { account: Account }) {
  const router = useRouter()
  const initials = getInitials(account.name || account.username)
  const [isSupportOpen, setIsSupportOpen] = useState(false)
  const { integrations } = useSiteConfig()

  async function handleLogout() {
    await logout()
    await refreshSession(router, "/")
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="cursor-pointer rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">{account.name}</p>
                <p className="wrap-break-word text-xs text-muted-foreground">{account.email}</p>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link to="/profile" />} className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </DropdownMenuItem>
          {integrations.billing.enabled && (
            <DropdownMenuItem render={<Link to="/pricing" />} className="gap-2">
              <CreditCard className="h-4 w-4" />
              Your Plan
            </DropdownMenuItem>
          )}
          <DropdownMenuItem render={<Link to="/settings" />} className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsSupportOpen(true)} className="gap-2">
            <LifeBuoy className="h-4 w-4" />
            Support
          </DropdownMenuItem>
          {account.isAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link to="/manage" />} className="gap-2">
                <Shield className="h-4 w-4" />
                Manage
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Log out
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link to="/home" />} className="gap-2">
            <House className="h-4 w-4" />
            Homepage
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <SupportDialog open={isSupportOpen} onOpenChange={setIsSupportOpen} account={account} />
    </>
  )
}
