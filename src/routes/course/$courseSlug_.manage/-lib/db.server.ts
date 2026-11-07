import { and, eq, ne } from "drizzle-orm"

import { type Queryable, courseSections, courses, db } from "@/lib/schema.server"
import type {
  AdminCourseDetails,
  AdminCourseSectionSummary,
  CourseDetailsFields,
  CourseSectionType,
} from "@/types/course"

/** Slug-uniqueness probe for the course editor: is `slug` taken by a *different* course? */
export async function readCourseIdBySlugExcluding(
  slug: string,
  excludeCourseId: number,
): Promise<number | null> {
  const [course] = await db
    .select({ id: courses.id })
    .from(courses)
    .where(and(eq(courses.slug, slug), eq(courses.deleted, false), ne(courses.id, excludeCourseId)))
    .limit(1)

  return course?.id ?? null
}

/**
 * Looks up a section by slug *including* soft-deleted rows, because
 * `ix_course_sections_course_id_slug` covers them too — a re-created section has to
 * revive the old row rather than insert alongside it.
 */
export async function readCourseSectionBySlug(courseId: number, slug: string) {
  const [section] = await db
    .select({ id: courseSections.id, deleted: courseSections.deleted })
    .from(courseSections)
    .where(and(eq(courseSections.courseId, courseId), eq(courseSections.slug, slug)))
    .limit(1)

  return section ?? null
}

export async function createCourseSection(
  values: {
    courseId: number
    slug: string
    title: string
    sectionType: CourseSectionType
    visibility: string
  },
  tx: Queryable = db,
): Promise<AdminCourseSectionSummary> {
  const [section] = await tx.insert(courseSections).values(values).returning({
    id: courseSections.id,
    slug: courseSections.slug,
    title: courseSections.title,
    sectionType: courseSections.sectionType,
    visibility: courseSections.visibility,
    alwaysOpen: courseSections.alwaysOpen,
  })

  return section
}

export async function updateCourseDetails(
  courseId: number,
  fields: CourseDetailsFields,
): Promise<AdminCourseDetails> {
  const [course] = await db.update(courses).set(fields).where(eq(courses.id, courseId)).returning({
    id: courses.id,
    slug: courses.slug,
    title: courses.title,
    shortDescription: courses.shortDescription,
    description: courses.description,
    cover: courses.cover,
    visibility: courses.visibility,
    videoUrl: courses.videoUrl,
    certificateTemplate: courses.certificateTemplate,
    isPaid: courses.isPaid,
    stripeProductId: courses.stripeProductId,
    additionalInformation: courses.additionalInformation,
  })

  return course
}

/**
 * Rewrites `courses.sections`, the ordered list of section slugs that is the single
 * source of section order. Adding, removing and reordering sections all end here.
 */
export async function updateCourseSectionSlugs(
  courseId: number,
  sectionSlugs: string[],
  tx: Queryable = db,
): Promise<void> {
  await tx.update(courses).set({ sections: sectionSlugs }).where(eq(courses.id, courseId))
}

/** Revives a soft-deleted section row so a re-created slug reuses it (see `readCourseSectionBySlug`). */
export async function restoreCourseSection(
  sectionId: number,
  fields: { title: string; sectionType: CourseSectionType; visibility: string },
  tx: Queryable = db,
): Promise<AdminCourseSectionSummary> {
  const [section] = await tx
    .update(courseSections)
    .set({ ...fields, deleted: false })
    .where(eq(courseSections.id, sectionId))
    .returning({
      id: courseSections.id,
      slug: courseSections.slug,
      title: courseSections.title,
      sectionType: courseSections.sectionType,
      visibility: courseSections.visibility,
      alwaysOpen: courseSections.alwaysOpen,
    })

  return section
}

/**
 * Frees the slug as well as flagging the row: `ix_course_sections_course_id_slug` covers
 * soft-deleted rows, so leaving the slug in place would block a section of the same name
 * from ever being created again. The original is kept in `legacy_slug`.
 */
export async function softDeleteCourseSection(
  sectionId: number,
  slug: string,
  tx: Queryable = db,
): Promise<void> {
  await tx
    .update(courseSections)
    .set({ deleted: true, legacySlug: slug, slug: new Date().toISOString() })
    .where(eq(courseSections.id, sectionId))
}
