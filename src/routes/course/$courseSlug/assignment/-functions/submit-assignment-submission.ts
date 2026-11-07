import { createServerFn } from "@tanstack/react-start"

import { authMiddleware } from "@/lib/utils"
import { captureEvent, readCourseForViewer } from "@/lib/utils.server"

import { createAssignmentSubmission, readAssignmentSectionBySlug } from "../-lib/db.server"
import { validateSubmissionAnswers } from "../-lib/utils"
import { canOpenSection, toSubmissionRequirements } from "../../../-lib/utils"

type SubmitResult =
  | { submitted: true; isDraft: boolean }
  | {
      error: string
      /** A message per requirement id, so the form can mark the offending inputs. */
      fieldErrors?: Record<string, string>
    }

/**
 * Records one attempt at an assignment; nothing is overwritten, and the evaluation queue
 * reduces an enrollee's attempts to the effective one. Answers are rebuilt from the assignment's
 * own `submission_requirements`, so the stored JSON can only hold fields it asked for.
 */
export const submitAssignmentSubmission = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (data: {
      courseSlug: string
      sectionSlug: string
      answers: Record<string, string>
      isDraft: boolean
    }) => data,
  )
  .handler(async ({ data, context }): Promise<SubmitResult> => {
    const { account } = context

    const viewer = await readCourseForViewer(data.courseSlug)
    if (!viewer) return { error: "This assignment could not be found." }

    const section = await readAssignmentSectionBySlug(viewer.course.id, data.sectionSlug)
    if (!section) return { error: "This assignment could not be found." }
    if (!canOpenSection(section, viewer)) {
      return { error: "This assignment could not be found." }
    }

    // An enrollment is what a subscription buys, so this is also where a lapsed subscriber is
    // turned away — `readCourseForViewer` ignores the rows a lapse soft-deleted.
    if (!viewer.isEnrolled) {
      return { error: "Enroll in this course to submit this assignment." }
    }

    const requirements = toSubmissionRequirements(section.submissionRequirements)
    if (!requirements.length) {
      return { error: "This assignment isn't accepting submissions." }
    }

    const answers = Object.fromEntries(
      requirements.map((requirement) => [
        requirement.id,
        (data.answers[requirement.id] ?? "").trim(),
      ]),
    )

    const fieldErrors = validateSubmissionAnswers(requirements, answers)
    if (Object.keys(fieldErrors).length) {
      return { error: "Fix the highlighted fields and submit again.", fieldErrors }
    }

    // `allow_draft` is read from the section rather than trusted from the form, so a draft
    // can't be parked outside the evaluation queue on an assignment that doesn't offer them.
    const isDraft = data.isDraft && !!section.allowDraft

    try {
      await createAssignmentSubmission({
        courseId: viewer.course.id,
        sectionId: section.id,
        enrolleeId: account.id,
        assignment: answers,
        isDraft,
      })
    } catch (error) {
      console.error("submitAssignmentSubmission: failed to record the submission", error)
      return { error: "Couldn't record your submission. Please try again." }
    }

    // A draft isn't in the evaluation queue yet, so only the real submission counts.
    if (!isDraft) {
      captureEvent(account.id, "assignment_submitted", {
        courseSlug: data.courseSlug,
        sectionSlug: data.sectionSlug,
      })
    }
    return { submitted: true, isDraft }
  })
