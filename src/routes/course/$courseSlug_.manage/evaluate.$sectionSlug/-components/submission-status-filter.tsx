import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { AssignmentStatus } from "@/types/assignment"
import type { AssignmentStatusCounts } from "@/types/evaluation"

import { ASSIGNMENT_STATUS_OPTIONS } from "../../../-lib/constants"

/**
 * Narrows the table to the ticked statuses; nothing ticked means every status, which is
 * what an empty `?status=` in the URL means too.
 */
export function SubmissionStatusFilter({
  counts,
  selected,
  onChange,
}: {
  counts: AssignmentStatusCounts
  selected: AssignmentStatus[]
  onChange: (statuses: AssignmentStatus[]) => void
}) {
  // PROCESSING is a transient state of automated evaluation, so it only earns a chip on the
  // assignments that actually use it — or while it is the filter someone is looking at.
  const options = ASSIGNMENT_STATUS_OPTIONS.filter(
    (option) =>
      option.value !== "PROCESSING" || counts.PROCESSING > 0 || selected.includes("PROCESSING"),
  )

  return (
    <ToggleGroup
      multiple
      variant="outline"
      spacing={0}
      value={selected}
      onValueChange={(value) => onChange(value as AssignmentStatus[])}
      aria-label="Filter by status"
    >
      {options.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value} size="sm">
          {option.label}
          <span className="text-muted-foreground tabular-nums">
            {counts[option.value as AssignmentStatus].toLocaleString()}
          </span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
