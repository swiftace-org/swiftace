import { CheckCircle2 } from "lucide-react"

import { cn } from "@/lib/utils"

/** The "you've finished this one" marker, shared by the lesson and assignment pages. */
export function SectionCompletedChip({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 text-sm font-medium text-primary", className)}>
      <CheckCircle2 className="size-4 shrink-0" aria-hidden />
      Completed
    </span>
  )
}
