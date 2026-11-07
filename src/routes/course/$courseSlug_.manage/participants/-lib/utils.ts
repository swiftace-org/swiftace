import { toFiniteNumber, toSortOrder, toStringArray } from "@/lib/utils"
import type { SearchParamsInput } from "@/lib/utils"
import type { CourseParticipantsSearch } from "@/types/participant"

import { DEFAULT_PARTICIPANTS_PER_PAGE, PARTICIPANTS_PER_PAGE_OPTIONS } from "./constants"

/**
 * Normalizes the participants table's search params, filling in every default so the
 * loader, the table and the toolbar never have to repeat them. Anything unrecognized
 * falls back rather than throwing — these come straight from a hand-editable URL.
 */
export function toCourseParticipantsSearch(
  search: SearchParamsInput<CourseParticipantsSearch>,
): CourseParticipantsSearch {
  const perPage = toFiniteNumber(search.perPage)
  const page = toFiniteNumber(search.page)

  return {
    page: page && page > 1 ? Math.trunc(page) : 1,
    perPage:
      perPage && PARTICIPANTS_PER_PAGE_OPTIONS.includes(perPage)
        ? perPage
        : DEFAULT_PARTICIPANTS_PER_PAGE,
    sort: search.sort === "email" || search.sort === "enrolledAt" ? search.sort : "name",
    order: toSortOrder(search.order, "asc"),
    q: typeof search.q === "string" ? search.q : "",
    certificate:
      search.certificate === "issued" || search.certificate === "none" ? search.certificate : "all",
    completed: toStringArray(search.completed),
    hideStaff: search.hideStaff === true,
  }
}

/** Whether anything is narrowing the participants table, as opposed to sorting or paging it. */
export function hasCourseParticipantFilters(search: CourseParticipantsSearch): boolean {
  return (
    !!search.q || search.certificate !== "all" || search.completed.length > 0 || search.hideStaff
  )
}
