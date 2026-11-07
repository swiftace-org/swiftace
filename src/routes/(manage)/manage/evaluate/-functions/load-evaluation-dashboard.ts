import { createServerFn } from "@tanstack/react-start"

import { adminMiddleware } from "@/lib/utils"
import type { AssignmentStatusCounts, EvaluationDashboard } from "@/types/evaluation"

import { readAssignmentEvaluationStats, readAssignmentsForEvaluation } from "../-lib/db.server"

const EMPTY_COUNTS: AssignmentStatusCounts = {
  PASS: 0,
  FAIL: 0,
  PENDING: 0,
  DRAFT: 0,
  PROCESSING: 0,
}

/**
 * Every assignment on the site with its evaluation queue. Two queries: the assignments, and one
 * grouped pass counting every assignment at once. Under a hundred assignments, so the page ships
 * them all and filters in the browser rather than re-running a heavy aggregate per keystroke.
 */
export const loadEvaluationDashboard = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async (): Promise<EvaluationDashboard> => {
    const [assignments, stats] = await Promise.all([
      readAssignmentsForEvaluation(),
      readAssignmentEvaluationStats(),
    ])

    // A Map keeps first-seen order, which is the query's course order.
    const courses = [
      ...new Map(
        assignments.map((assignment) => [
          assignment.courseSlug,
          { slug: assignment.courseSlug, title: assignment.courseTitle },
        ]),
      ).values(),
    ]
    const courseRank = new Map(courses.map((course, index) => [course.slug, index]))
    const statsBySection = new Map(stats.map((row) => [row.sectionId, row]))

    const ordered = [...assignments].sort(
      (a, b) =>
        (courseRank.get(a.courseSlug) ?? 0) - (courseRank.get(b.courseSlug) ?? 0) ||
        toSectionRank(a.courseSectionSlugs, a.sectionSlug) -
          toSectionRank(b.courseSectionSlugs, b.sectionSlug) ||
        a.sectionTitle.localeCompare(b.sectionTitle),
    )

    return {
      courses,
      assignments: ordered.map((assignment) => {
        const sectionStats = statsBySection.get(assignment.sectionId)
        return {
          sectionId: assignment.sectionId,
          courseSlug: assignment.courseSlug,
          courseTitle: assignment.courseTitle,
          assignmentSlug: assignment.sectionSlug,
          assignmentTitle: assignment.sectionTitle,
          totalSubmitters: sectionStats?.totalSubmitters ?? 0,
          counts: { ...EMPTY_COUNTS, ...sectionStats?.counts },
          oldestPending: sectionStats?.oldestPending ?? null,
        }
      }),
    }
  })

/** Assignments follow the course's own section order; anything unlisted sinks to the end. */
function toSectionRank(sectionSlugs: unknown, slug: string): number {
  const index = Array.isArray(sectionSlugs) ? sectionSlugs.indexOf(slug) : -1
  return index === -1 ? Number.MAX_SAFE_INTEGER : index
}
