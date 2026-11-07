import type { ManagedUserTab, UserDeletionCounts } from "@/types/user"

/** Enough to cover a learner's recent weeks without shipping years of quiz answers. */
export const USER_ACTIVITY_LIMIT = 150

/** Some legacy accounts committed thousands of notebooks; the tab lists the latest of them. */
export const USER_NOTEBOOKS_LIMIT = 100

export const MANAGED_USER_TABS: { value: ManagedUserTab; label: string }[] = [
  { value: "enrollments", label: "Enrollments" },
  { value: "submissions", label: "Submissions" },
  { value: "payments", label: "Payments" },
  { value: "quizzes", label: "Quizzes" },
  { value: "notebooks", label: "Notebooks" },
]

export const MANAGED_USER_TAB_VALUES = MANAGED_USER_TABS.map((tab) => tab.value)

export const DEFAULT_MANAGED_USER_TAB: ManagedUserTab = "enrollments"

/** What the delete dialog lists as gone for good, in the order a learner would think of it. */
export const USER_DELETION_DELETED_ITEMS: { key: keyof UserDeletionCounts; label: string }[] = [
  { key: "enrollments", label: "Course enrollments" },
  { key: "sectionProgress", label: "Lesson and assignment progress" },
  { key: "submissions", label: "Assignment submissions" },
  { key: "certificates", label: "Certificates" },
  { key: "quizAnswers", label: "Quiz answers" },
  { key: "notebooks", label: "Notebooks" },
  { key: "subscriptions", label: "Subscription records" },
  { key: "signInMethods", label: "Linked Google and GitHub sign-ins" },
  { key: "integrations", label: "Google Drive integration" },
  { key: "loginAttempts", label: "Email sign-in codes" },
]

/** Rows that belong to someone else's records too, so they stay without the account on them. */
export const USER_DELETION_UNLINKED_ITEMS: { key: keyof UserDeletionCounts; label: string }[] = [
  { key: "payments", label: "Course payments" },
  { key: "evaluations", label: "Submissions they evaluated" },
  { key: "authoredQuestions", label: "Questions they created" },
]

/** Only these Stripe states have ended; every other state can still resume or collect. */
export const USER_DELETION_TERMINAL_SUBSCRIPTION_STATUSES = ["canceled", "incomplete_expired"]
