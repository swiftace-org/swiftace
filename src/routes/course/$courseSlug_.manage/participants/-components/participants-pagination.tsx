import { getRouteApi } from "@tanstack/react-router"

import { TablePagination } from "@/components/table-pagination"
import type { CourseParticipantsPage, CourseParticipantsSearch } from "@/types/participant"

import { PARTICIPANTS_PER_PAGE_OPTIONS } from "../-lib/constants"

const participantsRoute = getRouteApi("/course/$courseSlug_/manage/participants/")

export function ParticipantsPagination({
  page,
  search,
}: {
  page: CourseParticipantsPage
  search: CourseParticipantsSearch
}) {
  const navigate = participantsRoute.useNavigate()

  return (
    <TablePagination
      page={search.page}
      perPage={search.perPage}
      perPageOptions={PARTICIPANTS_PER_PAGE_OPTIONS}
      totalPages={page.totalPages}
      totalRows={page.totalParticipants}
      rowLabel="participants"
      onPageChange={(nextPage) =>
        void navigate({ search: (prev) => ({ ...prev, page: nextPage }) })
      }
      onPerPageChange={(perPage) =>
        void navigate({ search: (prev) => ({ ...prev, perPage, page: 1 }) })
      }
    />
  )
}
