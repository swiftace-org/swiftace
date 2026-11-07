import { and, desc, eq } from "drizzle-orm"

import { DEFAULT_RESULTS_LIMIT } from "@/lib/db.server"
import { courseAssignmentSubmissions, courseSections, db } from "@/lib/schema.server"

/**
 * The assignment behind a section slug, with everything its submission form needs. Separate from
 * `readCourseSectionsBySlugs`, which feeds the sidebar for every section at once, because
 * `submission_requirements` and the evaluation guide are only wanted on this page.
 */
export async function readAssignmentSectionBySlug(courseId: number, slug: string) {
  const [section] = await db
    .select({
      id: courseSections.id,
      slug: courseSections.slug,
      title: courseSections.title,
      visibility: courseSections.visibility,
      alwaysOpen: courseSections.alwaysOpen,
      submissionRequirements: courseSections.submissionRequirements,
      allowDraft: courseSections.allowDraft,
      evaluationGuideInternal: courseSections.evaluationGuideInternal,
    })
    .from(courseSections)
    .where(
      and(
        eq(courseSections.courseId, courseId),
        eq(courseSections.slug, slug),
        eq(courseSections.deleted, false),
        eq(courseSections.sectionType, "ASSIGNMENT"),
      ),
    )
    .limit(1)

  return section ?? null
}

/**
 * One enrollee's own submissions, newest first. Unlike the evaluation pages this doesn't reduce to
 * an effective submission: the point of a history is that every attempt is listed.
 */
export async function readEnrolleeAssignmentSubmissions(
  sectionId: number,
  enrolleeId: number,
): Promise<
  {
    id: number
    createdAt: Date
    answers: unknown
    assignmentStatus: string | null
    isDraft: boolean
    comments: string | null
  }[]
> {
  return db
    .select({
      id: courseAssignmentSubmissions.id,
      createdAt: courseAssignmentSubmissions.createdAt,
      answers: courseAssignmentSubmissions.assignment,
      assignmentStatus: courseAssignmentSubmissions.assignmentStatus,
      isDraft: courseAssignmentSubmissions.isDraft,
      comments: courseAssignmentSubmissions.comments,
    })
    .from(courseAssignmentSubmissions)
    .where(
      and(
        eq(courseAssignmentSubmissions.sectionId, sectionId),
        eq(courseAssignmentSubmissions.enrolleeId, enrolleeId),
        eq(courseAssignmentSubmissions.deleted, false),
      ),
    )
    .orderBy(desc(courseAssignmentSubmissions.createdAt), desc(courseAssignmentSubmissions.id))
    .limit(DEFAULT_RESULTS_LIMIT)
}

/**
 * Records an attempt. Every attempt is its own row, since the evaluation pages reduce them to one
 * effective submission themselves. `assignment_status` is left NULL rather than PENDING, matching
 * the legacy app — `EFFECTIVE_STATUS` reads the two as the same thing.
 */
export async function createAssignmentSubmission(values: {
  courseId: number
  sectionId: number
  enrolleeId: number
  assignment: Record<string, string>
  isDraft: boolean
}): Promise<{ id: number }> {
  const [submission] = await db
    .insert(courseAssignmentSubmissions)
    .values(values)
    .returning({ id: courseAssignmentSubmissions.id })

  return submission
}
