import { getRouteApi } from "@tanstack/react-router"

import { TablePagination } from "@/components/table-pagination"
import type { AssignmentSubmissionsPage, AssignmentSubmissionsSearch } from "@/types/evaluation"

import { SUBMISSIONS_PER_PAGE_OPTIONS } from "../-lib/constants"

const evaluateRoute = getRouteApi("/course/$courseSlug_/manage/evaluate/$sectionSlug/")

export function SubmissionsPagination({
  page,
  search,
}: {
  page: AssignmentSubmissionsPage
  search: AssignmentSubmissionsSearch
}) {
  const navigate = evaluateRoute.useNavigate()

  return (
    <TablePagination
      page={search.page}
      perPage={search.perPage}
      perPageOptions={SUBMISSIONS_PER_PAGE_OPTIONS}
      totalPages={page.totalPages}
      totalRows={page.totalSubmissions}
      rowLabel="submissions"
      onPageChange={(nextPage) =>
        void navigate({ search: (prev) => ({ ...prev, page: nextPage }) })
      }
      onPerPageChange={(perPage) =>
        void navigate({ search: (prev) => ({ ...prev, perPage, page: 1 }) })
      }
    />
  )
}
