import { eq, inArray, sql } from "drizzle-orm"

import { courseOrder } from "@/lib/db.server"
import { courses, db } from "@/lib/schema.server"
import type { AdminCourseSummary } from "@/types/course"

export async function readCoursesForAdmin(): Promise<AdminCourseSummary[]> {
  return db
    .select({
      id: courses.id,
      slug: courses.slug,
      title: courses.title,
      visibility: courses.visibility,
    })
    .from(courses)
    .where(eq(courses.deleted, false))
    .orderBy(...courseOrder)
}

export async function readCourseIdsForAdmin(): Promise<number[]> {
  const rows = await db.select({ id: courses.id }).from(courses).where(eq(courses.deleted, false))
  return rows.map((row) => row.id)
}

export async function createCourse(values: {
  slug: string
  title: string
  ownerId: number
}): Promise<AdminCourseSummary> {
  const [course] = await db
    .insert(courses)
    // Listed last, after every course an admin has placed.
    .values({ ...values, position: sql`(SELECT COALESCE(MAX(position), -1) + 1 FROM courses)` })
    .returning({
      id: courses.id,
      slug: courses.slug,
      title: courses.title,
      visibility: courses.visibility,
    })

  return course
}

/** Rewrites every position in one statement, so a reorder never lands half-applied. */
export async function updateCoursePositions(courseIds: number[]): Promise<void> {
  if (!courseIds.length) return
  const positions = sql.join(
    courseIds.map((id, index) => sql`WHEN ${id} THEN ${index}::integer`),
    sql` `,
  )
  await db
    .update(courses)
    .set({ position: sql`CASE ${courses.id} ${positions} END` })
    .where(inArray(courses.id, courseIds))
}
