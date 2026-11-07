import { getRouteApi } from "@tanstack/react-router"
import { X } from "lucide-react"

import { DebouncedSearchInput } from "@/components/debounced-search-input"
import { Button } from "@/components/ui/button"
import type { AssignmentStatusCounts, AssignmentSubmissionsSearch } from "@/types/evaluation"

import { hasAssignmentSubmissionFilters } from "../-lib/utils"
import { SubmissionStatusFilter } from "./submission-status-filter"

const evaluateRoute = getRouteApi("/course/$courseSlug_/manage/evaluate/$sectionSlug/")

export function SubmissionsToolbar({
  search,
  statusCounts,
}: {
  search: AssignmentSubmissionsSearch
  statusCounts: AssignmentStatusCounts
}) {
  const navigate = evaluateRoute.useNavigate()

  // Any filter change can leave the current page past the end of the results, so all of
  // them reset to the first page.
  function updateFilters(patch: Partial<AssignmentSubmissionsSearch>, replace = false) {
    void navigate({ search: (prev) => ({ ...prev, ...patch, page: 1 }), replace })
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <DebouncedSearchInput
        value={search.q}
        onChange={(q) => updateFilters({ q }, true)}
        label="Search submitters"
        placeholder="Search name, username, email"
        className="lg:w-64"
      />
      <SubmissionStatusFilter
        counts={statusCounts}
        selected={search.status}
        onChange={(status) => updateFilters({ status })}
      />
      {hasAssignmentSubmissionFilters(search) ? (
        <Button variant="ghost" size="sm" onClick={() => updateFilters({ q: "", status: [] })}>
          <X />
          Clear
        </Button>
      ) : null}
    </div>
  )
}
