import type { SortOrder } from "@/types/common"

export type CourseParticipantSortField = "name" | "email" | "enrolledAt"

export type CourseParticipantSortOrder = SortOrder

export type CourseParticipantCertificateFilter = "all" | "issued" | "none"

/**
 * The normalized search params behind the participants table. Every field is concrete —
 * `toCourseParticipantsSearch` fills in the defaults — so the loader, the table and the
 * toolbar all read the same shape.
 */
export type CourseParticipantsSearch = {
  page: number
  perPage: number
  sort: CourseParticipantSortField
  order: CourseParticipantSortOrder
  /** Matches against name, username and email. */
  q: string
  certificate: CourseParticipantCertificateFilter
  /** Slugs of the sections a participant must have completed — *all* of them. */
  completed: string[]
  /** Hides accounts flagged `is_admin`, i.e. staff enrolled in the course. */
  hideStaff: boolean
}

/** The filters half of `CourseParticipantsSearch`, resolved to what the queries need. */
export type CourseParticipantsFilter = {
  courseId: number
  search: string
  certificate: CourseParticipantCertificateFilter
  /** Resolved from `CourseParticipantsSearch.completed`; empty means "no section filter". */
  completedSectionIds: number[]
  hideStaff: boolean
}

/** One row of the participants table. Progress counts cover the course's live sections only. */
export type CourseParticipant = {
  accountId: number
  name: string
  username: string
  email: string
  isStaff: boolean
  enrolledAt: Date
  certificationStatus: string | null
  /** Null when no certificate has been issued, or when the issued one was revoked. */
  certificateSlug: string | null
  completedLessons: number
  completedAssignments: number
}

export type CourseParticipantsPage = {
  participants: CourseParticipant[]
  /** Matching participants across every page, for the pagination summary. */
  totalParticipants: number
  totalPages: number
  totalLessons: number
  totalAssignments: number
}
