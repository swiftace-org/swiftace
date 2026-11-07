import { Check, Copy } from "lucide-react"
import { useState } from "react"

import { IconButton } from "@/components/icon-button"
import { toast } from "@/components/ui/toast"
import { cn, toSubmitErrorMessage } from "@/lib/utils"

/** How long the check mark stays up, confirming the copy where the cursor already is. */
const COPIED_FEEDBACK_MS = 1500

export function CopyEmailButton({ email, className }: { email: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(email)
      setCopied(true)
      setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS)
      toast.add({ type: "success", description: "Email copied." })
    } catch (error) {
      toast.add({
        type: "error",
        description: toSubmitErrorMessage(error, "Could not copy the email address."),
      })
    }
  }

  return (
    <IconButton
      tooltip={copied ? "Copied" : "Copy email"}
      size="icon-xs"
      className={cn("shrink-0", className)}
      onClick={handleCopy}
    >
      {copied ? <Check /> : <Copy />}
    </IconButton>
  )
}
