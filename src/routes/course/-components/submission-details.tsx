import type { SubmissionField } from "@/types/assignment"

import { SubmissionFieldValue } from "./submission-field-value"

/** What an enrollee actually submitted, titled by the assignment's submission requirements. */
export function SubmissionDetails({ fields }: { fields: SubmissionField[] }) {
  if (!fields.length) {
    return <p className="text-sm text-muted-foreground">No answers submitted.</p>
  }

  return (
    <div className="min-w-64 space-y-3">
      {fields.map((field) => (
        <div key={field.id} className="space-y-1">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {field.title}
          </p>
          <SubmissionFieldValue field={field} />
        </div>
      ))}
    </div>
  )
}
