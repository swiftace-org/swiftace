import { toFiniteNumber, toSortOrder, toStringArray } from "@/lib/utils"
import type { SearchParamsInput } from "@/lib/utils"
import type { AssignmentStatus } from "@/types/assignment"
import type { AssignmentSubmissionsSearch } from "@/types/evaluation"

import { ASSIGNMENT_STATUS_VALUES } from "../../../-lib/constants"
import { DEFAULT_SUBMISSIONS_PER_PAGE, SUBMISSIONS_PER_PAGE_OPTIONS } from "./constants"

/** Normalizes the evaluation table's search params. See `toEvaluationDashboardSearch`. */
export function toAssignmentSubmissionsSearch(
  search: SearchParamsInput<AssignmentSubmissionsSearch>,
): AssignmentSubmissionsSearch {
  const perPage = toFiniteNumber(search.perPage)
  const page = toFiniteNumber(search.page)

  return {
    page: page && page > 1 ? Math.trunc(page) : 1,
    perPage:
      perPage && SUBMISSIONS_PER_PAGE_OPTIONS.includes(perPage)
        ? perPage
        : DEFAULT_SUBMISSIONS_PER_PAGE,
    // Oldest first: the page is a queue, and the longest-waiting submission is the one an
    // admin should reach next.
    sort: search.sort === "username" ? "username" : "submittedAt",
    order: toSortOrder(search.order, "asc"),
    q: typeof search.q === "string" ? search.q : "",
    status: toStringArray(search.status).filter((status): status is AssignmentStatus =>
      ASSIGNMENT_STATUS_VALUES.includes(status),
    ),
  }
}

/** Whether anything is narrowing the evaluation table, as opposed to sorting or paging it. */
export function hasAssignmentSubmissionFilters(search: AssignmentSubmissionsSearch): boolean {
  return !!search.q || search.status.length > 0
}
