import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useSiteConfig } from "@/lib/hooks"

import { toSubscriptionPlanName } from "../../(billing)/-lib/utils"

/**
 * Shown instead of redirecting straight to `/pricing` — bouncing them to a page they didn't
 * ask for reads as broken, while this at least says why they were stopped before sending them on.
 * With billing off there's no plan to sell, so paid courses are granted by hand through support.
 */
export function UpgradeRequiredDialog({
  open,
  onOpenChange,
  courseSlug,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseSlug: string
}) {
  const config = useSiteConfig()
  const { general, integrations } = config
  const planName = toSubscriptionPlanName(config)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {integrations.billing.enabled ? (
          <DialogHeader>
            <DialogTitle>Upgrade to {planName}</DialogTitle>
            <DialogDescription>
              You need a {planName} subscription to enroll in this course, submit assignments and
              earn a certificate.
            </DialogDescription>
          </DialogHeader>
        ) : (
          <DialogHeader>
            <DialogTitle>This is a paid course</DialogTitle>
            <DialogDescription>
              Enrollment in this course is by invitation. Contact {general.supportEmail} to ask for
              access.
            </DialogDescription>
          </DialogHeader>
        )}
        <DialogFooter showCloseButton>
          {integrations.billing.enabled ? (
            <Button
              render={
                <Link to="/pricing" search={{ courseSlug }}>
                  View Plans
                </Link>
              }
              nativeButton={false}
            />
          ) : (
            <Button
              render={<a href={`mailto:${general.supportEmail}`}>Contact Support</a>}
              nativeButton={false}
            />
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
