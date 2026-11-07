import { createServerFn } from "@tanstack/react-start"

import { runInTransaction } from "@/lib/schema.server"
import { adminMiddleware } from "@/lib/utils"
import type { EvaluationDecision } from "@/types/evaluation"

import {
  readAssignmentSubmissionById,
  readHasOtherPassedSubmission,
  updateAssignmentSubmissionEvaluation,
  updateCourseSectionIncomplete,
} from "../-lib/db.server"
import { sendAssignmentEvaluationEmail } from "../-lib/utils.server"
import { createOrUpdateSectionCompletion } from "../../../-lib/db.server"

/**
 * Records an admin's verdict and keeps the enrollee's section progress in step: passing completes
 * the section, withdrawing their only pass un-completes it. One transaction, so a submission can
 * never read as passed while its section reads as unfinished. A verdict emails the enrollee when
 * the section has `evaluation_email_manual`; requeueing never does.
 */
export const submitEvaluateSubmission = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: { submissionId: number; status: EvaluationDecision; comments: string }) => data)
  .handler(async ({ data, context }) => {
    const comments = data.comments.trim()
    if (data.status === "FAIL" && !comments) {
      return { error: "Add a comment explaining what to fix before failing a submission." }
    }

    const submission = await readAssignmentSubmissionById(data.submissionId)
    if (!submission) {
      return { error: "That submission no longer exists." }
    }

    try {
      await runInTransaction(async (tx) => {
        await updateAssignmentSubmissionEvaluation(
          submission.id,
          {
            assignmentStatus: data.status,
            // A submission put back in the queue belongs to nobody, and carries no feedback.
            evaluatorId: data.status === "PENDING" ? null : context.account.id,
            comments: data.status === "PENDING" ? null : comments || null,
          },
          tx,
        )

        if (data.status === "PASS") {
          // The section is completed as of the submission, not as of the evaluation, so a
          // slow turnaround doesn't backdate wrongly or postdate the enrollee's progress.
          await createOrUpdateSectionCompletion(
            {
              sectionId: submission.sectionId,
              enrolleeId: submission.enrolleeId,
              completedAt: submission.createdAt,
            },
            tx,
          )
          return
        }

        // Withdrawing a pass only un-completes the section if the enrollee has no other
        // passing submission for it — resubmissions mean they often do.
        if (submission.assignmentStatus !== "PASS") return
        const stillPassed = await readHasOtherPassedSubmission(
          submission.sectionId,
          submission.enrolleeId,
          submission.id,
          tx,
        )
        if (!stillPassed) {
          await updateCourseSectionIncomplete(submission.sectionId, submission.enrolleeId, tx)
        }
      })
    } catch (error) {
      console.error("submitEvaluateSubmission: failed to save evaluation", error)
      return { error: "Couldn't save this evaluation. Please try again." }
    }

    // The verdict is already saved, so a failed send is logged rather than surfaced — the
    // admin shouldn't be told the evaluation didn't go through when it did.
    if (data.status !== "PENDING" && submission.section.evaluationEmailManual) {
      const email = await sendAssignmentEvaluationEmail({
        email: submission.enrollee.email,
        recipientName: submission.enrollee.name,
        status: data.status,
        courseSlug: submission.course.slug,
        courseTitle: submission.course.title,
        sectionSlug: submission.section.slug,
        assignmentTitle: submission.section.title,
        submissionId: submission.id,
        comments: data.status === "FAIL" ? comments : null,
      })
      if (!email.success) {
        console.error("submitEvaluateSubmission: failed to email the result", {
          submissionId: submission.id,
          error: email.error,
        })
      }
    }

    return { status: data.status }
  })
