import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { SortOrder } from "@/types/common"

/**
 * A sortable column header for the admin tables. Sorting happens in the database (or, for
 * a table small enough to arrive in one payload, against the whole data set), so a click is
 * a navigation rather than a table state change — the caller decides what `onToggle` does.
 */
export function SortHeader({
  label,
  isActive,
  order,
  align = "start",
  onToggle,
}: {
  label: string
  isActive: boolean
  order: SortOrder
  /** Numeric columns read better right-aligned, which needs the padding trimmed that side. */
  align?: "start" | "end"
  onToggle: () => void
}) {
  const Icon = !isActive ? ChevronsUpDown : order === "asc" ? ArrowUp : ArrowDown

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "font-medium",
        align === "end" ? "-mr-2.5" : "-ml-2.5",
        !isActive && "text-muted-foreground",
      )}
      onClick={onToggle}
    >
      {label}
      <Icon />
    </Button>
  )
}
