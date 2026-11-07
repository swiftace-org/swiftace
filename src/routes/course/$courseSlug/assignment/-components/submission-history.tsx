import { Markdown } from "@/components/markdown"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatRelativeTime } from "@/lib/utils"
import type { LearnerSubmission } from "@/types/assignment"

import { SubmissionDetails } from "../../../-components/submission-details"
import { SubmissionStatusBadge } from "../../../-components/submission-status-badge"

const dateTimeFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
})

/**
 * Every attempt this enrollee has made, newest first — not just the effective one, so a
 * resubmission after a fail still shows what the fail said. Cards rather than the legacy table:
 * an answer can be an essay, and feedback usually is.
 */
export function SubmissionHistory({ submissions }: { submissions: LearnerSubmission[] }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Your submissions</h2>
      {submissions.map((submission) => (
        <div key={submission.id} className="flex flex-col gap-3 rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SubmissionStatusBadge status={submission.status} />
            <Tooltip>
              <TooltipTrigger className="cursor-default text-sm text-muted-foreground">
                {/* Server and browser can land on either side of a minute boundary. */}
                <span suppressHydrationWarning>{formatRelativeTime(submission.submittedAt)}</span>
              </TooltipTrigger>
              <TooltipContent>
                {dateTimeFormatter.format(new Date(submission.submittedAt))}
              </TooltipContent>
            </Tooltip>
          </div>

          <SubmissionDetails fields={submission.fields} />

          {submission.commentsHtml && (
            <div className="flex flex-col gap-1 border-t pt-3">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Feedback
              </p>
              <Markdown markup={submission.commentsHtml} className="prose-sm" />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
