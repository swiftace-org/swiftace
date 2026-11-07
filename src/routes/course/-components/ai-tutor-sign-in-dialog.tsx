import { Link, useLocation } from "@tanstack/react-router"

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

import { AiTutorAvatar } from "./ai-tutor-avatar"

/** What a signed-out visitor gets on sending, so they learn the tutor is there before signing in. */
export function AiTutorSignInDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const next = useLocation({ select: (location) => location.href })
  const { aiTutor } = useSiteConfig()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <AiTutorAvatar className="mb-2 size-10" />
          <DialogTitle>Sign in to chat with {aiTutor.name}</DialogTitle>
          <DialogDescription>
            {aiTutor.name} can explain any lesson, help you debug your code and suggest what to
            learn next. It's free to sign up.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Not now
          </Button>
          <Button
            render={
              <Link to="/login" search={{ next }}>
                Sign in
              </Link>
            }
            nativeButton={false}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
