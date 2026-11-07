import type {
  ManageUsersRoleFilter,
  ManageUsersSearch,
  ManageUsersSortField,
  SubscriptionPlan,
} from "@/types/user"

/**
 * The page's side padding. The table runs edge to edge, so its first and last cells take the
 * same padding to line up with the heading and toolbar above.
 */
export const PAGE_GUTTER = "px-4 sm:px-6 lg:px-8"

export const PAGE_GUTTER_LEFT = "pl-4 sm:pl-6 lg:pl-8"

export const STRIPE_DASHBOARD_URL = "https://dashboard.stripe.com"

/** Stripe's statuses for a renewal it couldn't charge: still retrying, or given up on. */
export const PAYMENT_FAILED_SUBSCRIPTION_STATUSES = ["past_due", "unpaid"]

/** `course_payments.payment_status` once Stripe confirms the charge; the rest were abandoned. */
export const PAYMENT_STATUS_SUCCEEDED = "succeeded"

export const USERS_PER_PAGE_OPTIONS = [100, 250, 500, 1000]

export const DEFAULT_USERS_PER_PAGE = 100

export const MANAGE_USERS_SORT_OPTIONS: { value: ManageUsersSortField; label: string }[] = [
  { value: "createdAt", label: "Signed up" },
  { value: "name", label: "Name" },
  { value: "email", label: "Email" },
]

export const MANAGE_USERS_SORT_LABELS = Object.fromEntries(
  MANAGE_USERS_SORT_OPTIONS.map((option) => [option.value, option.label]),
)

export const MANAGE_USERS_SORT_VALUES = MANAGE_USERS_SORT_OPTIONS.map((option) => option.value)

/** Newest sign-ups first, so the table opens on who just joined. */
export const DEFAULT_MANAGE_USERS_SORT: ManageUsersSortField = "createdAt"

export const MANAGE_USERS_ROLE_OPTIONS: { value: ManageUsersRoleFilter; label: string }[] = [
  { value: "all", label: "All users" },
  { value: "enrolled", label: "Enrolled" },
  { value: "subscribers", label: "Subscribers" },
  { value: "buyers", label: "Course buyers" },
  { value: "admins", label: "Admins" },
  { value: "spammers", label: "Flagged as spam" },
]

export const MANAGE_USERS_ROLE_VALUES = MANAGE_USERS_ROLE_OPTIONS.map((option) => option.value)

export const SUBSCRIPTION_PLAN_LABELS: Record<SubscriptionPlan, string> = {
  free: "Free",
  monthly: "Pro Monthly",
  yearly: "Pro Yearly",
  pro: "Pro",
}

export const MANAGE_USERS_ROLE_LABELS = Object.fromEntries(
  MANAGE_USERS_ROLE_OPTIONS.map((option) => [option.value, option.label]),
)

export const DEFAULT_MANAGE_USERS_SEARCH: ManageUsersSearch = {
  page: 1,
  perPage: DEFAULT_USERS_PER_PAGE,
  sort: DEFAULT_MANAGE_USERS_SORT,
  order: "desc",
  q: "",
  role: "all",
}
