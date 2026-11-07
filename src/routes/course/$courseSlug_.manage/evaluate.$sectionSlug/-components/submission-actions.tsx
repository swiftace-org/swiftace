import { useRouter } from "@tanstack/react-router"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { toSubmitErrorMessage } from "@/lib/utils"
import type { AssignmentSubmission, EvaluationDecision } from "@/types/evaluation"

import { submitEvaluateSubmission } from "../-functions/evaluate-submission"
import { ASSIGNMENT_STATUS_LABELS, EVALUATION_DECISIONS } from "../../../-lib/constants"

/** How a verdict button looks once it *is* the submission's current status. */
const ACTIVE_VARIANTS: Record<EvaluationDecision, "default" | "destructive" | "secondary"> = {
  PASS: "default",
  FAIL: "destructive",
  PENDING: "secondary",
}

export function SubmissionActions({ submission }: { submission: AssignmentSubmission }) {
  const router = useRouter()
  const [comments, setComments] = useState(submission.comments ?? "")
  const [pendingDecision, setPendingDecision] = useState<EvaluationDecision | null>(null)

  // The row can be replaced under the panel by an invalidation or a page change, so the
  // box follows whatever feedback the submission now carries.
  const syncKey = `${submission.id}:${submission.comments ?? ""}`
  const [syncedKey, setSyncedKey] = useState(syncKey)
  if (syncKey !== syncedKey) {
    setSyncedKey(syncKey)
    setComments(submission.comments ?? "")
  }

  async function handleEvaluate(status: EvaluationDecision) {
    // Checked here as well as on the server so the button doesn't round-trip to say no.
    if (status === "FAIL" && !comments.trim()) {
      toast.add({
        type: "error",
        description: "Add a comment explaining what to fix before failing a submission.",
      })
      return
    }

    setPendingDecision(status)
    try {
      const result = await submitEvaluateSubmission({
        data: { submissionId: submission.id, status, comments },
      })
      if ("error" in result) {
        toast.add({ type: "error", description: result.error })
        return
      }
      toast.add({
        type: "success",
        description: `${submission.submitter.username} marked as ${ASSIGNMENT_STATUS_LABELS[status]}.`,
      })
      await router.invalidate()
    } catch (error) {
      toast.add({
        type: "error",
        description: toSubmitErrorMessage(error, "Failed to save this evaluation."),
      })
    } finally {
      setPendingDecision(null)
    }
  }

  return (
    <div className="w-72 space-y-2">
      <Textarea
        value={comments}
        rows={3}
        placeholder="Feedback for the submitter (markdown supported)"
        aria-label={`Feedback for ${submission.submitter.username}`}
        onChange={(event) => setComments(event.target.value)}
      />
      <div className="flex items-center gap-1.5">
        {EVALUATION_DECISIONS.map((decision) => {
          const isCurrent = submission.status === decision
          return (
            <Button
              key={decision}
              size="sm"
              variant={isCurrent ? ACTIVE_VARIANTS[decision] : "outline"}
              // Re-applying the status a submission already holds would be a no-op write.
              disabled={isCurrent || pendingDecision !== null}
              onClick={() => handleEvaluate(decision)}
            >
              {pendingDecision === decision ? "Saving..." : ASSIGNMENT_STATUS_LABELS[decision]}
            </Button>
          )
        })}
      </div>
      {submission.evaluator ? (
        <p className="text-xs text-muted-foreground">
          Evaluated by {submission.evaluator.name} (@{submission.evaluator.username})
        </p>
      ) : null}
    </div>
  )
}
