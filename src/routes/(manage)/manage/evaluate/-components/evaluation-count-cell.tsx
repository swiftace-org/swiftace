import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

/**
 * One of an assignment's status counts. The share of submitters it represents is the number
 * that actually tells an admin something, so it sits in a tooltip on every non-zero count.
 */
export function EvaluationCountCell({
  value,
  total,
  emphasize = false,
}: {
  value: number
  total: number
  /** Used for the pending count, the one column worth spotting from across the table. */
  emphasize?: boolean
}) {
  if (!value) {
    return <span className="text-muted-foreground tabular-nums">0</span>
  }

  return (
    <Tooltip>
      <TooltipTrigger
        className={cn("cursor-default tabular-nums", emphasize && "font-medium text-foreground")}
      >
        {value.toLocaleString("en-US")}
      </TooltipTrigger>
      <TooltipContent>{Math.round((value / total) * 100)}% of submitters</TooltipContent>
    </Tooltip>
  )
}
