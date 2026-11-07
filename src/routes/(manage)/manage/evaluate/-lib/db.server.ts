import { and, eq, sql } from "drizzle-orm"

import { courseOrder, effectiveSubmissions } from "@/lib/db.server"
import { courseSections, courses, db } from "@/lib/schema.server"

/**
 * Every assignment across every live course, with the course it belongs to and that course's
 * section order — the dashboard's rows before their counts are attached. Courses come in order.
 */
export async function readAssignmentsForEvaluation(): Promise<
  {
    sectionId: number
    sectionSlug: string
    sectionTitle: string
    courseId: number
    courseSlug: string
    courseTitle: string
    /** `courses.sections`; see `readCourseSectionSlugs` for why it is the only order. */
    courseSectionSlugs: unknown
  }[]
> {
  return db
    .select({
      sectionId: courseSections.id,
      sectionSlug: courseSections.slug,
      sectionTitle: courseSections.title,
      courseId: courses.id,
      courseSlug: courses.slug,
      courseTitle: courses.title,
      courseSectionSlugs: courses.sections,
    })
    .from(courseSections)
    .innerJoin(courses, eq(courses.id, courseSections.courseId))
    .where(
      and(
        eq(courseSections.deleted, false),
        eq(courseSections.sectionType, "ASSIGNMENT"),
        eq(courses.deleted, false),
      ),
    )
    .orderBy(...courseOrder)
}

/**
 * How many enrollees hold each status on each assignment, plus how long the oldest pending
 * submission has been waiting — the whole dashboard in one pass over the submissions table.
 */
export async function readAssignmentEvaluationStats(): Promise<
  {
    sectionId: number
    counts: Record<string, number>
    totalSubmitters: number
    oldestPending: Date | null
  }[]
> {
  const effective = effectiveSubmissions()

  const rows = await db
    .with(effective)
    .select({
      sectionId: effective.sectionId,
      status: effective.status,
      total: sql<number>`count(*)`,
      oldestPending: sql<Date | null>`min(${effective.submittedAt})`,
    })
    .from(effective)
    .groupBy(effective.sectionId, effective.status)

  const bySection = new Map<
    number,
    {
      sectionId: number
      counts: Record<string, number>
      totalSubmitters: number
      oldestPending: Date | null
    }
  >()
  for (const row of rows) {
    const total = Number(row.total ?? 0)
    const section = bySection.get(row.sectionId) ?? {
      sectionId: row.sectionId,
      counts: {},
      totalSubmitters: 0,
      oldestPending: null,
    }
    section.counts[row.status] = total
    section.totalSubmitters += total
    if (row.status === "PENDING") section.oldestPending = row.oldestPending
    bySection.set(row.sectionId, section)
  }

  return [...bySection.values()]
}
