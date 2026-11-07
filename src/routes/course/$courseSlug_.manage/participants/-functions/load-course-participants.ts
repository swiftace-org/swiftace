import { createServerFn } from "@tanstack/react-start"

import { adminMiddleware } from "@/lib/utils"
import type { CourseParticipantsPage, CourseParticipantsSearch } from "@/types/participant"

import { COURSE_CERTIFICATION_STATUS_REVOKED } from "../-lib/constants"
import {
  readCourseParticipants,
  readCourseParticipantsCount,
  readCourseSectionCompletionCounts,
  readCourseSectionSlugsBySlug,
} from "../-lib/db.server"
import { readCourseSectionsBySlugsForAdmin } from "../../../-lib/db.server"

const EMPTY_PAGE: CourseParticipantsPage = {
  participants: [],
  totalParticipants: 0,
  totalPages: 0,
  totalLessons: 0,
  totalAssignments: 0,
}

/**
 * One page of a course's participants, filtered and sorted in the database — a popular course can
 * have tens of thousands of enrollments. Five indexed queries whatever the page size, including one
 * grouped pass over `course_section_progress` covering every row on the page.
 */
export const loadCourseParticipants = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .validator((data: { courseSlug: string } & CourseParticipantsSearch) => data)
  .handler(async ({ data }): Promise<CourseParticipantsPage> => {
    const course = await readCourseSectionSlugsBySlug(data.courseSlug)
    if (!course) return EMPTY_PAGE

    const sections = await readCourseSectionsBySlugsForAdmin(course.courseId, course.sectionSlugs)
    const lessonIds = sections
      .filter((section) => section.sectionType === "LESSON")
      .map((section) => section.id)
    const assignmentIds = sections
      .filter((section) => section.sectionType === "ASSIGNMENT")
      .map((section) => section.id)

    const requestedSlugs = new Set(data.completed)
    const filter = {
      courseId: course.courseId,
      search: data.q.trim(),
      certificate: data.certificate,
      completedSectionIds: sections
        .filter((section) => requestedSlugs.has(section.slug))
        .map((section) => section.id),
      hideStaff: data.hideStaff,
    }

    const [totalParticipants, rows] = await Promise.all([
      readCourseParticipantsCount(filter),
      readCourseParticipants(filter, {
        sort: data.sort,
        order: data.order,
        limit: data.perPage,
        offset: (data.page - 1) * data.perPage,
      }),
    ])

    const completions = await readCourseSectionCompletionCounts(
      [...lessonIds, ...assignmentIds],
      rows.map((row) => row.accountId),
    )
    const completedLessons = new Map<number, number>()
    const completedAssignments = new Map<number, number>()
    for (const completion of completions) {
      const counts =
        completion.sectionType === "ASSIGNMENT" ? completedAssignments : completedLessons
      counts.set(completion.enrolleeId, completion.completed)
    }

    return {
      participants: rows.map((row) => ({
        ...row,
        // A revoked certificate row stays in the table but must not be linked anywhere.
        certificateSlug:
          row.certificationStatus === COURSE_CERTIFICATION_STATUS_REVOKED
            ? null
            : row.certificateSlug,
        completedLessons: completedLessons.get(row.accountId) ?? 0,
        completedAssignments: completedAssignments.get(row.accountId) ?? 0,
      })),
      totalParticipants,
      totalPages: Math.ceil(totalParticipants / data.perPage),
      totalLessons: lessonIds.length,
      totalAssignments: assignmentIds.length,
    }
  })
