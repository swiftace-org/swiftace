import { and, asc, desc, eq, gt, gte, ilike, inArray, or, sql } from "drizzle-orm"

import { EFFECTIVE_STATUS, courseOrder, escapeLikePattern, listedCourse } from "@/lib/db.server"
import {
  type Queryable,
  aiTutorConversations,
  aiTutorMessages,
  aiTutorUsageWindows,
  courseAssignmentSubmissions,
  courseEnrollments,
  courseSectionProgress,
  courseSections,
  courses,
  db,
} from "@/lib/schema.server"
import type { AiTutorConversationSummary, AiTutorUsageWindowKind } from "@/types/ai-tutor"
import type { AssignmentStatus } from "@/types/assignment"
import type {
  AdminCourseSectionSummary,
  CourseSectionDisplay,
  CourseOutlineRow,
  CourseSectionOutlineRow,
} from "@/types/course"

import { SECTION_COMPLETE_PROGRESS } from "./constants"

/**
 * The ordered list of section slugs backing a course. `courses.sections` is the
 * only source of section order — `course_sections` also holds stale/legacy rows
 * that aren't listed there and must not be surfaced.
 */
export async function readCourseSectionSlugs(
  courseId: number,
  tx: Queryable = db,
): Promise<string[]> {
  const [course] = await tx
    .select({ sections: courses.sections })
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1)

  return Array.isArray(course?.sections) ? (course.sections as string[]) : []
}

/** Sections are returned in `slugs` order; see `readCourseSectionSlugs` for where that comes from. */
export async function readCourseSectionsBySlugs(
  courseId: number,
  slugs: string[],
): Promise<CourseSectionDisplay[]> {
  if (!slugs.length) return []

  const sections = await db
    .select({
      id: courseSections.id,
      slug: courseSections.slug,
      shortSlug: courseSections.shortSlug,
      title: courseSections.title,
      titlePrefix: courseSections.titlePrefix,
      sectionType: courseSections.sectionType,
      videoUrl: courseSections.videoUrl,
      shortDescription: courseSections.shortDescription,
      description: courseSections.description,
      resources: courseSections.resources,
      additionalInformation: courseSections.additionalInformation,
      quizUrl: courseSections.quizUrl,
      // Callers decide what to do with this — see `isSectionDisplayed` / `isSectionOpen`.
      // It must not be dropped here: without it every section reads as openable.
      visibility: courseSections.visibility,
      alwaysOpen: courseSections.alwaysOpen,
      isOptional: courseSections.isOptional,
      requireQuestions: courseSections.requireQuestions,
    })
    .from(courseSections)
    .where(
      and(
        eq(courseSections.courseId, courseId),
        eq(courseSections.deleted, false),
        inArray(courseSections.slug, slugs),
      ),
    )

  return sortBySlug(sections, slugs)
}

/** Like `readCourseSectionsBySlugs`, plus the draft/hidden state only admins need. */
export async function readCourseSectionsBySlugsForAdmin(
  courseId: number,
  slugs: string[],
): Promise<AdminCourseSectionSummary[]> {
  if (!slugs.length) return []

  const sections = await db
    .select({
      id: courseSections.id,
      slug: courseSections.slug,
      title: courseSections.title,
      sectionType: courseSections.sectionType,
      visibility: courseSections.visibility,
      alwaysOpen: courseSections.alwaysOpen,
    })
    .from(courseSections)
    .where(
      and(
        eq(courseSections.courseId, courseId),
        eq(courseSections.deleted, false),
        inArray(courseSections.slug, slugs),
      ),
    )

  return sortBySlug(sections, slugs)
}

/** Which of `sectionIds` one enrollee has finished, for the ticks down the course page. */
export async function readCompletedSectionIds(
  sectionIds: number[],
  enrolleeId: number,
): Promise<number[]> {
  if (!sectionIds.length) return []

  const rows = await db
    .select({ sectionId: courseSectionProgress.sectionId })
    .from(courseSectionProgress)
    .where(
      and(
        inArray(courseSectionProgress.sectionId, sectionIds),
        eq(courseSectionProgress.enrolleeId, enrolleeId),
        eq(courseSectionProgress.deleted, false),
        gte(courseSectionProgress.progress, SECTION_COMPLETE_PROGRESS),
      ),
    )

  return rows.map((row) => row.sectionId)
}

/**
 * Marks a section complete for an enrollee, creating the progress row on first arrival.
 * `completed_at` is only filled when empty, matching the legacy `mark_as_completed` — finishing
 * a lesson twice shouldn't move the original date.
 */
export async function createOrUpdateSectionCompletion(
  values: { sectionId: number; enrolleeId: number; completedAt: Date },
  tx: Queryable = db,
): Promise<void> {
  await tx
    .insert(courseSectionProgress)
    .values({ ...values, progress: SECTION_COMPLETE_PROGRESS })
    .onConflictDoUpdate({
      target: [courseSectionProgress.sectionId, courseSectionProgress.enrolleeId],
      set: {
        progress: SECTION_COMPLETE_PROGRESS,
        deleted: false,
        completedAt: sql`coalesce(${courseSectionProgress.completedAt}, excluded.completed_at)`,
      },
    })
}

/** Every listed course, with what the sitemap and llms.txt need to enumerate and date its pages. */
export async function readListedCourseOutlines(): Promise<CourseOutlineRow[]> {
  return db
    .select({
      id: courses.id,
      slug: courses.slug,
      title: courses.title,
      shortDescription: courses.shortDescription,
      isPaid: courses.isPaid,
      sections: courses.sections,
      lastModified: sql<Date>`coalesce(${courses.updatedAt}, ${courses.createdAt})`.mapWith(
        courses.createdAt,
      ),
    })
    .from(courses)
    .where(listedCourse)
    .orderBy(...courseOrder)
}

/** Unfiltered by visibility, so the caller can apply the same gates as the pages themselves. */
export async function readCourseSectionOutlines(
  courseIds: number[],
): Promise<CourseSectionOutlineRow[]> {
  if (!courseIds.length) return []

  return db
    .select({
      courseId: courseSections.courseId,
      slug: courseSections.slug,
      title: courseSections.title,
      sectionType: courseSections.sectionType,
      visibility: courseSections.visibility,
      alwaysOpen: courseSections.alwaysOpen,
      lastModified:
        sql<Date>`coalesce(${courseSections.updatedAt}, ${courseSections.createdAt})`.mapWith(
          courseSections.createdAt,
        ),
    })
    .from(courseSections)
    .where(and(inArray(courseSections.courseId, courseIds), eq(courseSections.deleted, false)))
}

/** Restores the caller's requested slug order after an `inArray` query loses it. */
function sortBySlug<T extends { slug: string }>(rows: T[], slugs: string[]): T[] {
  const order = new Map(slugs.map((slug, index) => [slug, index]))
  return [...rows].sort(
    (a, b) =>
      (order.get(a.slug) ?? Number.MAX_SAFE_INTEGER) -
      (order.get(b.slug) ?? Number.MAX_SAFE_INTEGER),
  )
}

export async function createAiTutorConversation(values: {
  accountId: number
  courseId: number
}): Promise<number> {
  const [row] = await db
    .insert(aiTutorConversations)
    .values(values)
    .returning({ id: aiTutorConversations.id })
  return row.id
}

/** Scoped to the learner and course, so a conversation id from elsewhere reads as missing. */
export async function readAiTutorConversation(
  conversationId: number,
  accountId: number,
  courseId: number,
): Promise<AiTutorConversationSummary | null> {
  const [row] = await db
    .select({
      id: aiTutorConversations.id,
      title: aiTutorConversations.title,
      lastMessageAt: aiTutorConversations.lastMessageAt,
    })
    .from(aiTutorConversations)
    .where(
      and(
        eq(aiTutorConversations.id, conversationId),
        eq(aiTutorConversations.accountId, accountId),
        eq(aiTutorConversations.courseId, courseId),
        eq(aiTutorConversations.deleted, false),
      ),
    )
    .limit(1)
  return row ?? null
}

export async function readAiTutorConversations(
  accountId: number,
  courseId: number,
  limit: number,
): Promise<AiTutorConversationSummary[]> {
  return db
    .select({
      id: aiTutorConversations.id,
      title: aiTutorConversations.title,
      lastMessageAt: aiTutorConversations.lastMessageAt,
    })
    .from(aiTutorConversations)
    .where(
      and(
        eq(aiTutorConversations.accountId, accountId),
        eq(aiTutorConversations.courseId, courseId),
        eq(aiTutorConversations.deleted, false),
      ),
    )
    .orderBy(desc(aiTutorConversations.lastMessageAt), desc(aiTutorConversations.id))
    .limit(limit)
}

/** Adds a reply's cost to the conversation's running total and marks it as just active. */
export async function updateAiTutorConversationAfterMessage(
  conversationId: number,
  costMicros: number,
): Promise<void> {
  await db
    .update(aiTutorConversations)
    .set({
      lastMessageAt: new Date(),
      costMicros: sql`${aiTutorConversations.costMicros} + ${costMicros}`,
    })
    .where(eq(aiTutorConversations.id, conversationId))
}

export async function updateAiTutorConversationTitle(
  conversationId: number,
  title: string,
): Promise<void> {
  await db
    .update(aiTutorConversations)
    .set({ title })
    .where(eq(aiTutorConversations.id, conversationId))
}

/** Returns whether there was such a conversation to delete. */
export async function softDeleteAiTutorConversation(
  conversationId: number,
  accountId: number,
): Promise<boolean> {
  const rows = await db
    .update(aiTutorConversations)
    .set({ deleted: true })
    .where(
      and(
        eq(aiTutorConversations.id, conversationId),
        eq(aiTutorConversations.accountId, accountId),
        eq(aiTutorConversations.deleted, false),
      ),
    )
    .returning({ id: aiTutorConversations.id })
  return rows.length > 0
}

/** The most recent `limit` messages, oldest first. */
export async function readAiTutorMessages(
  conversationId: number,
  limit: number,
): Promise<
  {
    id: number
    createdAt: Date
    role: string
    parts: unknown
    status: string | null
  }[]
> {
  const rows = await db
    .select({
      id: aiTutorMessages.id,
      createdAt: aiTutorMessages.createdAt,
      role: aiTutorMessages.role,
      parts: aiTutorMessages.parts,
      status: aiTutorMessages.status,
    })
    .from(aiTutorMessages)
    .where(eq(aiTutorMessages.conversationId, conversationId))
    .orderBy(desc(aiTutorMessages.id))
    .limit(limit)
  return rows.reverse()
}

export async function createAiTutorMessage(
  values: typeof aiTutorMessages.$inferInsert,
): Promise<number> {
  const [row] = await db
    .insert(aiTutorMessages)
    .values(values)
    .returning({ id: aiTutorMessages.id })
  return row.id
}

/** Ended windows are left out: each kind's next one opens with the next message. */
export async function readOpenAiTutorUsageWindows(
  accountId: number,
  now: Date,
): Promise<{ id: number; kind: string; startedAt: Date; endsAt: Date; spentMicros: number }[]> {
  return db
    .select({
      id: aiTutorUsageWindows.id,
      kind: aiTutorUsageWindows.kind,
      startedAt: aiTutorUsageWindows.startedAt,
      endsAt: aiTutorUsageWindows.endsAt,
      spentMicros: aiTutorUsageWindows.spentMicros,
    })
    .from(aiTutorUsageWindows)
    .where(and(eq(aiTutorUsageWindows.accountId, accountId), gt(aiTutorUsageWindows.endsAt, now)))
    .orderBy(desc(aiTutorUsageWindows.endsAt))
}

export async function createAiTutorUsageWindows(
  accountId: number,
  windows: { kind: AiTutorUsageWindowKind; startedAt: Date; endsAt: Date }[],
): Promise<void> {
  if (!windows.length) return
  await db
    .insert(aiTutorUsageWindows)
    .values(windows.map((window) => ({ ...window, accountId })))
    .onConflictDoNothing()
}

export async function addAiTutorUsageWindowSpend(
  windowIds: number[],
  costMicros: number,
): Promise<void> {
  if (!windowIds.length || !costMicros) return
  await db
    .update(aiTutorUsageWindows)
    .set({ spentMicros: sql`${aiTutorUsageWindows.spentMicros} + ${costMicros}` })
    .where(inArray(aiTutorUsageWindows.id, windowIds))
}

/** One section's full text, for the AI tutor. Gating is left to the caller, as everywhere else. */
export async function readCourseSectionForAiTutor(courseId: number, slug: string) {
  const [section] = await db
    .select({
      id: courseSections.id,
      slug: courseSections.slug,
      title: courseSections.title,
      titlePrefix: courseSections.titlePrefix,
      sectionType: courseSections.sectionType,
      visibility: courseSections.visibility,
      alwaysOpen: courseSections.alwaysOpen,
      shortDescription: courseSections.shortDescription,
      description: courseSections.description,
      transcript: courseSections.transcript,
      resources: courseSections.resources,
      quizUrl: courseSections.quizUrl,
      submissionRequirements: courseSections.submissionRequirements,
      dueDate: courseSections.dueDate,
    })
    .from(courseSections)
    .where(
      and(
        eq(courseSections.courseId, courseId),
        eq(courseSections.slug, slug),
        eq(courseSections.deleted, false),
      ),
    )
    .limit(1)
  return section ?? null
}

/** Sections among `slugs` whose title, blurb, description or transcript mention `query`. */
export async function searchCourseSectionsForAiTutor(
  courseId: number,
  slugs: string[],
  query: string,
  limit: number,
) {
  if (!slugs.length) return []
  const pattern = `%${escapeLikePattern(query)}%`
  return db
    .select({
      slug: courseSections.slug,
      title: courseSections.title,
      sectionType: courseSections.sectionType,
      visibility: courseSections.visibility,
      alwaysOpen: courseSections.alwaysOpen,
      shortDescription: courseSections.shortDescription,
      description: courseSections.description,
      transcript: courseSections.transcript,
    })
    .from(courseSections)
    .where(
      and(
        eq(courseSections.courseId, courseId),
        eq(courseSections.deleted, false),
        inArray(courseSections.slug, slugs),
        or(
          ilike(courseSections.title, pattern),
          ilike(courseSections.shortDescription, pattern),
          ilike(courseSections.description, pattern),
          ilike(courseSections.transcript, pattern),
        ),
      ),
    )
    .limit(limit)
}

/** Every one of a learner's submissions in a course, newest first, with the grader's feedback. */
export async function readLearnerCourseSubmissions(
  courseId: number,
  enrolleeId: number,
): Promise<
  {
    sectionId: number
    sectionSlug: string
    sectionTitle: string
    submittedAt: Date
    status: AssignmentStatus
    answers: unknown
    comments: string | null
  }[]
> {
  return db
    .select({
      sectionId: courseSections.id,
      sectionSlug: courseSections.slug,
      sectionTitle: courseSections.title,
      submittedAt: courseAssignmentSubmissions.createdAt,
      status: EFFECTIVE_STATUS,
      answers: courseAssignmentSubmissions.assignment,
      comments: courseAssignmentSubmissions.comments,
    })
    .from(courseAssignmentSubmissions)
    .innerJoin(courseSections, eq(courseSections.id, courseAssignmentSubmissions.sectionId))
    .where(
      and(
        eq(courseAssignmentSubmissions.courseId, courseId),
        eq(courseAssignmentSubmissions.enrolleeId, enrolleeId),
        eq(courseAssignmentSubmissions.deleted, false),
        eq(courseSections.deleted, false),
      ),
    )
    .orderBy(desc(courseAssignmentSubmissions.createdAt))
}

/** The courses a learner is enrolled in, oldest enrollment first, with their section lists. */
export async function readLearnerEnrolledCourses(enrolleeId: number) {
  return db
    .select({
      id: courses.id,
      slug: courses.slug,
      title: courses.title,
      sections: courses.sections,
      enrolledAt: courseEnrollments.createdAt,
    })
    .from(courseEnrollments)
    .innerJoin(courses, eq(courses.id, courseEnrollments.courseId))
    .where(
      and(
        eq(courseEnrollments.enrolleeId, enrolleeId),
        eq(courseEnrollments.deleted, false),
        eq(courses.deleted, false),
      ),
    )
    .orderBy(asc(courseEnrollments.createdAt))
}

/** The slugs of the sections a learner has completed in each of `courseIds`. */
export async function readLearnerCompletedSectionSlugs(
  enrolleeId: number,
  courseIds: number[],
): Promise<{ courseId: number; slug: string }[]> {
  if (!courseIds.length) return []
  return db
    .select({ courseId: courseSections.courseId, slug: courseSections.slug })
    .from(courseSectionProgress)
    .innerJoin(courseSections, eq(courseSections.id, courseSectionProgress.sectionId))
    .where(
      and(
        eq(courseSectionProgress.enrolleeId, enrolleeId),
        eq(courseSectionProgress.deleted, false),
        gte(courseSectionProgress.progress, SECTION_COMPLETE_PROGRESS),
        eq(courseSections.deleted, false),
        inArray(courseSections.courseId, courseIds),
      ),
    )
}
