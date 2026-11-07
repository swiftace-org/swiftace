import { Link } from "@tanstack/react-router"
import { Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"

/**
 * The navbar's route into the paid plan. Rendered only for signed-in accounts without an
 * active subscription — a subscriber has nothing to upgrade to, and a signed-out visitor
 * gets the Log In button instead.
 */
export function UpgradeButton({ courseSlug }: { courseSlug?: string }) {
  return (
    <Button
      render={
        <Link to="/pricing" search={courseSlug ? { courseSlug } : {}}>
          <Sparkles />
          Upgrade
        </Link>
      }
      nativeButton={false}
      size="sm"
    />
  )
}
