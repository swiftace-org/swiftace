import type { AssignmentStatus } from "@/types/assignment"
import type { SortOrder } from "@/types/common"

/**
 * Columns the users table can sort on — each one indexed on `accounts`, except `name`, which
 * is still quick enough. "Last active" is deliberately absent: deriving it means aggregating
 * every activity table across half a million accounts, which takes seconds.
 */
export type ManageUsersSortField = "createdAt" | "name" | "email"

/**
 * `subscribers` hold an access-granting subscription; `buyers` have a succeeded course payment,
 * which a paid-course enrollment alone doesn't prove.
 */
export type ManageUsersRoleFilter =
  | "all"
  | "enrolled"
  | "subscribers"
  | "buyers"
  | "admins"
  | "spammers"

/** `pro` is a live subscription on a price that is neither of the current two. */
export type SubscriptionPlan = "free" | "monthly" | "yearly" | "pro"

/** The normalized search params behind the users table; `toManageUsersSearch` fills defaults. */
export type ManageUsersSearch = {
  page: number
  perPage: number
  sort: ManageUsersSortField
  order: SortOrder
  /** Matches against name and email. */
  q: string
  role: ManageUsersRoleFilter
}

export type ManageUsersFilter = {
  search: string
  role: ManageUsersRoleFilter
}

export type ManagedUserRow = {
  id: number
  name: string
  username: string
  email: string
  isAdmin: boolean
  flaggedAsSpammer: boolean
  createdAt: Date
}

/** A course someone is enrolled in, as the users table's enrollments popover lists it. */
export type UserEnrollmentSummary = {
  courseSlug: string
  courseTitle: string
  enrolledAt: Date
  /** A succeeded `course_payments` charge for it, or a paid course while they subscribe to Pro. */
  paid: boolean
}

export type ManagedUserListRow = ManagedUserRow & {
  enrollments: UserEnrollmentSummary[]
  plan: SubscriptionPlan
  subscription: ManagedUserSubscription | null
  lastActiveAt: Date
}

/** The account's live subscriptions, folded into what the users table flags. */
export type ManagedUserSubscription = {
  stripeSubscriptionId: string
  trialing: boolean
  canceling: boolean
  /** Only `past_due` or `unpaid` subscriptions are left, so the account has no access. */
  paymentFailed: boolean
}

export type ManageUsersPage = {
  users: ManagedUserListRow[]
  /** Matching users across every page, for the pagination summary. */
  totalUsers: number
}

export type ManagedUserProfile = ManagedUserRow & {
  /** The OAuth providers linked to the account, beside the always-available email code. */
  signInMethods: { provider: "google" | "github"; identity: string; linkedAt: Date }[]
  activeSubscription: { status: string; currentPeriodEnd: Date | null } | null
}

export type ManagedUserEnrollment = {
  courseSlug: string
  courseTitle: string
  enrolledAt: Date
  /** `course_enrollments.payment_status` — how the enrollment was granted, when not free. */
  paymentStatus: string | null
  certificationStatus: string | null
  /** Null when no certificate was issued, or the issued one was revoked. */
  certificateSlug: string | null
  completedLessons: number
  totalLessons: number
  completedAssignments: number
  totalAssignments: number
}

export type ManagedUserSubmission = {
  id: number
  courseSlug: string
  courseTitle: string
  assignmentSlug: string
  assignmentTitle: string
  submittedAt: Date
  /** When an evaluator last touched the submission; null while it is still waiting. */
  evaluatedAt: Date | null
  status: AssignmentStatus
  evaluator: { name: string; username: string } | null
  comments: string | null
}

export type ManagedUserPayment = {
  kind: "course" | "subscription"
  /** The course title, or the subscription's Stripe id. */
  description: string
  courseSlug: string | null
  /** Minor units, as Stripe reports them; null for a subscription row. */
  amount: number | null
  currency: string | null
  status: string | null
  createdAt: Date
  /** The Stripe object worth looking up: payment intent or subscription. */
  stripeId: string
  /** Subscriptions only. */
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
}

export type ManagedUserQuizSummary = {
  quizSlug: string
  quizTitle: string
  answered: number
  correct: number
  firstAttemptAt: Date
  lastAttemptAt: Date
}

export type ManagedUserNotebook = {
  id: number
  title: string
  visibility: string | null
  createdAt: Date
  updatedAt: Date
}

export type UserActivityKind =
  | "SIGNED_UP"
  | "SIGNED_IN"
  | "LINKED_PROVIDER"
  | "ENROLLED"
  | "SECTION_PROGRESS"
  | "SUBMITTED"
  | "EVALUATED"
  | "QUIZ"
  | "NOTEBOOK"
  | "PAYMENT"
  | "SUBSCRIBED"
  | "CERTIFIED"

/**
 * One entry of a user's activity feed. The columns are generic because the feed is a single
 * `UNION ALL` across tables; `kind` says how to read them.
 */
export type UserActivity = {
  kind: UserActivityKind
  at: Date
  courseSlug: string | null
  courseTitle: string | null
  /** The section, quiz, notebook, provider or certificate the event is about. */
  subject: string | null
  /** Section slug, quiz slug or certificate slug, for links. */
  subjectSlug: string | null
  /** Kind-specific: a progress percentage, a status, a section type, an amount. */
  detail: string | null
  /** Kind-specific number: quiz questions answered, payment amount in minor units. */
  count: number | null
  /** Kind-specific: correct quiz answers, or the currency for a payment. */
  extra: string | null
}

/** A `UserActivity` as the raw `UNION ALL` query returns it, before `toUserActivity`. */
export type UserActivityRow = {
  kind: UserActivityKind
  at: string | Date
  course_slug: string | null
  course_title: string | null
  subject: string | null
  subject_slug: string | null
  detail: string | null
  count: string | number | null
  extra: string | null
}

/** An entry of the site-wide feed on `/manage`, which also says whose activity it was. */
export type SiteActivity = UserActivity & {
  account: { id: number; name: string; username: string } | null
}

/**
 * Where the next page of the site-wide feed starts. `at` is Postgres's own text, because a `Date`
 * would drop the microseconds legacy rows carry and skip whatever falls between.
 */
export type SiteActivityCursor = { at: string; key: string }

/** `/manage/activity`'s URL: whether admins' own activity is shown too. */
export type SiteActivitySearch = { admins: boolean }

export type SiteActivityPage = {
  activity: SiteActivity[]
  nextCursor: SiteActivityCursor | null
}

export type ManagedUserTab = "enrollments" | "submissions" | "payments" | "quizzes" | "notebooks"

export type ManagedUserOverview = {
  profile: ManagedUserProfile
  enrollments: ManagedUserEnrollment[]
  submissions: ManagedUserSubmission[]
  payments: ManagedUserPayment[]
  quizzes: ManagedUserQuizSummary[]
  notebooks: ManagedUserNotebook[]
  totalNotebooks: number
  activity: UserActivity[]
  /** Submissions this account evaluated for others — only ever non-zero for staff. */
  evaluationsGiven: number
}

/**
 * What a hard delete of one account touches. `payments`, `evaluations` and `authoredQuestions`
 * are kept but unlinked from it; `ownedCourses` blocks the delete outright.
 */
export type UserDeletionCounts = {
  enrollments: number
  sectionProgress: number
  submissions: number
  certificates: number
  quizAnswers: number
  notebooks: number
  subscriptions: number
  signInMethods: number
  integrations: number
  loginAttempts: number
  payments: number
  evaluations: number
  authoredQuestions: number
  ownedCourses: number
}

export type UserDeletionCertificate = {
  slug: string
  courseTitle: string
  issuedAt: Date
  downloadUrl: string
}

export type UserDeletionPreview = {
  counts: UserDeletionCounts
  /** Why the account can't be deleted yet; the delete stays disabled while any remain. */
  blockers: string[]
  certificates: UserDeletionCertificate[]
}
