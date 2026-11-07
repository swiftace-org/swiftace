import type { LucideIcon } from "lucide-react"

export function SectionIcon({ Icon }: { Icon: LucideIcon }) {
  return (
    <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
      <Icon className="size-6" aria-hidden />
    </div>
  )
}
