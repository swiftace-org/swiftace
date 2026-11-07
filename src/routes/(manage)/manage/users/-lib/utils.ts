import { toFiniteNumber, toSortOrder } from "@/lib/utils"
import type { SearchParamsInput } from "@/lib/utils"
import type { ManageUsersRoleFilter, ManageUsersSearch, ManageUsersSortField } from "@/types/user"

import {
  DEFAULT_MANAGE_USERS_SORT,
  DEFAULT_USERS_PER_PAGE,
  MANAGE_USERS_ROLE_VALUES,
  MANAGE_USERS_SORT_VALUES,
  USERS_PER_PAGE_OPTIONS,
} from "./constants"

/**
 * Normalizes the users table's search params, filling in every default so the loader, the
 * table and the toolbar never repeat them. Anything unrecognized falls back rather than
 * throwing — these come straight from a hand-editable URL.
 */
export function toManageUsersSearch(
  search: SearchParamsInput<ManageUsersSearch>,
): ManageUsersSearch {
  const perPage = toFiniteNumber(search.perPage)
  const page = toFiniteNumber(search.page)
  const sort = MANAGE_USERS_SORT_VALUES.includes(search.sort as ManageUsersSortField)
    ? (search.sort as ManageUsersSortField)
    : DEFAULT_MANAGE_USERS_SORT

  return {
    page: page && page > 1 ? Math.trunc(page) : 1,
    perPage: perPage && USERS_PER_PAGE_OPTIONS.includes(perPage) ? perPage : DEFAULT_USERS_PER_PAGE,
    sort,
    order: toSortOrder(search.order, defaultSortOrder(sort)),
    q: typeof search.q === "string" ? search.q : "",
    role: MANAGE_USERS_ROLE_VALUES.includes(search.role as ManageUsersRoleFilter)
      ? (search.role as ManageUsersRoleFilter)
      : "all",
  }
}

/** Dates read newest-first; text columns read A to Z. */
export function defaultSortOrder(sort: ManageUsersSortField) {
  return sort === "createdAt" ? "desc" : "asc"
}

/** Whether anything is narrowing the users table, as opposed to sorting or paging it. */
export function hasManageUsersFilters(search: ManageUsersSearch): boolean {
  return !!search.q || search.role !== "all"
}

// Always UTC: the server can't know the viewer's zone, and formatting in the browser's own
// would change the text after hydration.
const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" })

const dateTimeFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
})

export function formatDate(value: Date | string): string {
  return dateFormatter.format(new Date(value))
}

/** Bare, for columns whose header already says UTC; `formatDateTimeUtc` for standalone text. */
export function formatDateTime(value: Date | string): string {
  return dateTimeFormatter.format(new Date(value))
}

export function formatDateTimeUtc(value: Date | string): string {
  return `${formatDateTime(value)} UTC`
}
