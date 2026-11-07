import { cn } from "@/lib/utils"

/** How many of a course's lessons or assignments a participant has finished. */
export function SectionProgress({ completed, total }: { completed: number; total: number }) {
  if (!total) {
    return <span className="text-muted-foreground">—</span>
  }

  const isComplete = completed >= total

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", isComplete ? "bg-primary" : "bg-muted-foreground")}
          style={{ width: `${Math.min(100, Math.round((completed / total) * 100))}%` }}
        />
      </div>
      <span
        className={cn(
          "text-xs tabular-nums",
          isComplete ? "font-medium text-foreground" : "text-muted-foreground",
        )}
      >
        {completed}/{total}
      </span>
    </div>
  )
}
