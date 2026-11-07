import { Link } from "@tanstack/react-router"
import { Sparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/** The blue tint that marks Pro everywhere — the navbar, and plan chips in the admin tables. */
export const PRO_BADGE_CLASSES =
  "bg-primary/10 text-primary dark:bg-primary/25 dark:text-primary-foreground"

/** Sits where `UpgradeButton` would, once there's nothing left to upgrade to. */
export function ProBadge({ linkToPricing = false }: { linkToPricing?: boolean }) {
  return (
    <Badge
      render={linkToPricing ? <Link to="/pricing" /> : undefined}
      className={cn(
        "gap-1",
        PRO_BADGE_CLASSES,
        // Overrides the default variant's own `[a]:hover:` tint, which turns solid blue.
        linkToPricing &&
          "cursor-pointer [a]:hover:bg-primary/20 [a]:hover:text-primary dark:[a]:hover:bg-primary/40 dark:[a]:hover:text-primary-foreground",
      )}
    >
      <Sparkles />
      Pro
    </Badge>
  )
}
