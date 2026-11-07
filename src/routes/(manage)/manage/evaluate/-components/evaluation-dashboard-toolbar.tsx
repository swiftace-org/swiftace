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
import type { EvaluationDashboard, EvaluationDashboardSearch } from "@/types/evaluation"

import { hasEvaluationDashboardFilters } from "../-lib/utils"

const evaluateRoute = getRouteApi("/(manage)/manage/evaluate/")

export function EvaluationDashboardToolbar({
  search,
  courses,
}: {
  search: EvaluationDashboardSearch
  courses: EvaluationDashboard["courses"]
}) {
  const navigate = evaluateRoute.useNavigate()

  function updateFilters(patch: Partial<EvaluationDashboardSearch>, replace = false) {
    void navigate({ search: (prev) => ({ ...prev, ...patch }), replace })
  }

  const courseLabels = {
    all: "All courses",
    ...Object.fromEntries(courses.map((course) => [course.slug, course.title])),
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <DebouncedSearchInput
        value={search.q}
        onChange={(q) => updateFilters({ q }, true)}
        label="Search assignments"
        placeholder="Search assignment or course"
        className="lg:w-64"
      />
      <Select
        items={courseLabels}
        value={search.course}
        onValueChange={(value) => updateFilters({ course: value as string })}
      >
        <SelectTrigger aria-label="Filter by course" className="h-9! w-full lg:w-64">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-80">
          <SelectItem value="all">All courses</SelectItem>
          {courses.map((course) => (
            <SelectItem key={course.slug} value={course.slug}>
              {course.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex items-center gap-2">
        <Checkbox
          id="pending-only"
          checked={search.pendingOnly}
          onCheckedChange={(checked) => updateFilters({ pendingOnly: checked === true })}
        />
        <Label htmlFor="pending-only" className="whitespace-nowrap">
          Needs evaluation
        </Label>
      </div>
      {hasEvaluationDashboardFilters(search) ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => updateFilters({ q: "", course: "all", pendingOnly: false })}
        >
          <X />
          Clear
        </Button>
      ) : null}
    </div>
  )
}
