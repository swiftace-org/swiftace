import { getRouteApi } from "@tanstack/react-router"
import { X } from "lucide-react"

import { DebouncedSearchInput } from "@/components/debounced-search-input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { AdminCourseSectionSummary } from "@/types/course"
import type {
  CourseParticipantCertificateFilter,
  CourseParticipantsSearch,
} from "@/types/participant"

import {
  PARTICIPANT_CERTIFICATE_FILTER_LABELS,
  PARTICIPANT_CERTIFICATE_FILTER_OPTIONS,
} from "../-lib/constants"
import { hasCourseParticipantFilters } from "../-lib/utils"
import { CompletedSectionsFilter } from "./completed-sections-filter"

const participantsRoute = getRouteApi("/course/$courseSlug_/manage/participants/")

export function ParticipantsToolbar({
  search,
  sections,
}: {
  search: CourseParticipantsSearch
  sections: AdminCourseSectionSummary[]
}) {
  const navigate = participantsRoute.useNavigate()

  // Any filter change can leave the current page past the end of the results, so all of
  // them reset to the first page.
  function updateFilters(patch: Partial<CourseParticipantsSearch>, replace = false) {
    void navigate({ search: (prev) => ({ ...prev, ...patch, page: 1 }), replace })
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <DebouncedSearchInput
        value={search.q}
        onChange={(q) => updateFilters({ q }, true)}
        label="Search participants"
        placeholder="Search name, username, email"
        className="lg:w-64"
      />
      <Select
        items={PARTICIPANT_CERTIFICATE_FILTER_LABELS}
        value={search.certificate}
        onValueChange={(value) =>
          updateFilters({ certificate: value as CourseParticipantCertificateFilter })
        }
      >
        <SelectTrigger aria-label="Filter by certificate" className="h-9! w-full lg:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PARTICIPANT_CERTIFICATE_FILTER_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <CompletedSectionsFilter
        sections={sections}
        selected={search.completed}
        onChange={(completed) => updateFilters({ completed })}
      />
      <div className="flex items-center gap-2">
        <Checkbox
          id="hide-staff"
          checked={search.hideStaff}
          onCheckedChange={(checked) => updateFilters({ hideStaff: checked === true })}
        />
        <Label htmlFor="hide-staff" className="whitespace-nowrap">
          Hide staff
        </Label>
      </div>
      {hasCourseParticipantFilters(search) ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            updateFilters({ q: "", certificate: "all", completed: [], hideStaff: false })
          }
        >
          <X />
          Clear
        </Button>
      ) : null}
    </div>
  )
}
