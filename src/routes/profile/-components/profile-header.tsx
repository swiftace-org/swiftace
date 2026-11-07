import { Link } from "@tanstack/react-router"
import { CalendarDays, ShieldAlert } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getInitials } from "@/lib/utils"
import type { Account } from "@/types/account"

export function ProfileHeader({ account }: { account: Account }) {
  const initials = getInitials(account.name || account.username)
  const joinedDate = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(
    account.createdAt,
  )

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{account.name}</h1>
            {account.flaggedAsSpammer ? (
              <Badge variant="destructive" className="gap-1">
                <ShieldAlert className="h-3 w-3" />
                Flagged
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarDays className="h-3 w-3" />
            Joined {joinedDate}
          </p>
        </div>
      </div>
      <Button
        render={<Link to="/settings">Edit profile</Link>}
        nativeButton={false}
        variant="outline"
        size="sm"
      />
    </div>
  )
}
