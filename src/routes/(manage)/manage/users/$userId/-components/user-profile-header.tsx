import { KeyRound, Mail } from "lucide-react"

import { BlueLink } from "@/components/blue-link"
import { ProBadge } from "@/components/pro-badge"
import { Badge } from "@/components/ui/badge"
import type { ManagedUserProfile } from "@/types/user"

import { CopyEmailButton } from "../../-components/copy-email-button"
import { UserAvatar } from "../../-components/user-avatar"
import { UserRoleBadges } from "../../-components/user-role-badges"
import { UtcDateTime } from "../../-components/utc-date-time"
import { formatDate } from "../../-lib/utils"
import { DeleteUserDialog } from "./delete-user-dialog"

export function UserProfileHeader({
  profile,
  lastActiveAt,
}: {
  profile: ManagedUserProfile
  lastActiveAt: Date | null
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <UserAvatar name={profile.name || profile.email} size="lg" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="space-y-0.5">
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-semibold">
            <span className="break-words">{profile.name || "Unnamed"}</span>
            {profile.activeSubscription ? <ProBadge /> : null}
            <UserRoleBadges user={profile} />
          </h1>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <BlueLink external href={`mailto:${profile.email}`} className="break-all">
                {profile.email}
              </BlueLink>
              <CopyEmailButton email={profile.email} />
            </span>
            <span>
              <span className="tabular-nums">{profile.id}</span>
              {profile.username ? ` · ${profile.username}` : null}
            </span>
          </p>
        </div>
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <div className="flex gap-1.5">
            <dt className="text-muted-foreground">Joined</dt>
            <dd>
              <UtcDateTime withZone value={profile.createdAt} />
            </dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-muted-foreground">Last active</dt>
            <dd>{lastActiveAt ? <UtcDateTime withZone value={lastActiveAt} /> : "—"}</dd>
          </div>
          {profile.activeSubscription?.currentPeriodEnd ? (
            <div className="flex gap-1.5">
              <dt className="text-muted-foreground">Pro until</dt>
              <dd>{formatDate(profile.activeSubscription.currentPeriodEnd)}</dd>
            </div>
          ) : null}
        </dl>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm text-muted-foreground">Signs in with</span>
          <Badge variant="outline">
            <Mail />
            Email code
          </Badge>
          {profile.signInMethods.map((method) => (
            <Badge key={`${method.provider}:${method.identity}`} variant="outline">
              <KeyRound />
              {PROVIDER_LABELS[method.provider]}
              <span className="font-normal text-muted-foreground">{method.identity}</span>
            </Badge>
          ))}
        </div>
      </div>
      <DeleteUserDialog profile={profile} />
    </div>
  )
}

const PROVIDER_LABELS = { google: "Google", github: "GitHub" }
