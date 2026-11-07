import { Badge } from "@/components/ui/badge"
import type { AssignmentStatus } from "@/types/assignment"

import { ASSIGNMENT_STATUS_LABELS } from "../-lib/constants"

/** Draft and processing are outlined rather than filled — neither is an admin's verdict. */
const STATUS_VARIANTS: Record<
  AssignmentStatus,
  "default" | "destructive" | "secondary" | "outline"
> = {
  PASS: "default",
  FAIL: "destructive",
  PENDING: "secondary",
  DRAFT: "outline",
  PROCESSING: "outline",
}

export function SubmissionStatusBadge({ status }: { status: AssignmentStatus }) {
  return <Badge variant={STATUS_VARIANTS[status]}>{ASSIGNMENT_STATUS_LABELS[status]}</Badge>
}
