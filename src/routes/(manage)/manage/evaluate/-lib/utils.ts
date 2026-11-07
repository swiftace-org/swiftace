import { toSortOrder } from "@/lib/utils"
import type { SearchParamsInput } from "@/lib/utils"
import type { EvaluationDashboardSearch, EvaluationDashboardSortField } from "@/types/evaluation"

const EVALUATION_DASHBOARD_SORT_FIELDS: EvaluationDashboardSortField[] = [
  "course",
  "assignment",
  "totalSubmitters",
  "PASS",
  "FAIL",
  "DRAFT",
  "PENDING",
  "oldestPending",
]

/**
 * Normalizes the evaluation dashboard's search params. Same contract as
 * `toCourseParticipantsSearch`: every field is filled in, and anything unrecognized in a
 * hand-edited URL falls back to the default instead of throwing.
 */
export function toEvaluationDashboardSearch(
  search: SearchParamsInput<EvaluationDashboardSearch>,
): EvaluationDashboardSearch {
  return {
    q: typeof search.q === "string" ? search.q : "",
    course: typeof search.course === "string" && search.course ? search.course : "all",
    pendingOnly: search.pendingOnly === true,
    // The default keeps the natural order the loader builds: courses in their configured
    // order, assignments in the order they appear in the course.
    sort: EVALUATION_DASHBOARD_SORT_FIELDS.includes(search.sort as EvaluationDashboardSortField)
      ? (search.sort as EvaluationDashboardSortField)
      : "course",
    order: toSortOrder(search.order, "asc"),
  }
}

/** Whether anything is narrowing the dashboard, as opposed to sorting it. */
export function hasEvaluationDashboardFilters(search: EvaluationDashboardSearch): boolean {
  return !!search.q || search.course !== "all" || search.pendingOnly
}
