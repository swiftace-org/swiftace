import { getRouteApi, Link } from "@tanstack/react-router"
import { tableFeatures, useTable, type ColumnDef } from "@tanstack/react-table"
import { ListChecks } from "lucide-react"
import { useMemo } from "react"

import { BlueLink } from "@/components/blue-link"
import { IconButton } from "@/components/icon-button"
import { SortHeader } from "@/components/sort-header"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn, formatRelativeTime } from "@/lib/utils"
import type {
  AssignmentEvaluationStats,
  EvaluationDashboardSearch,
  EvaluationDashboardSortField,
} from "@/types/evaluation"

import { hasEvaluationDashboardFilters } from "../-lib/utils"
import { EvaluationCountCell } from "./evaluation-count-cell"

const evaluateRoute = getRouteApi("/(manage)/manage/evaluate/")

// Sorting and filtering happen before the rows reach the table, so it registers no features.
const features = tableFeatures({})

const dateTimeFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
})

/** Keeps the assignment column in place while the counts scroll sideways on a narrow screen. */
const STICKY_COLUMN = "sticky left-0 z-10 bg-background"

export function EvaluationDashboardTable({
  assignments,
  search,
}: {
  assignments: AssignmentEvaluationStats[]
  search: EvaluationDashboardSearch
}) {
  const navigate = evaluateRoute.useNavigate()
  const rows = useMemo(() => filterAndSort(assignments, search), [assignments, search])

  const columns = useMemo<ColumnDef<typeof features, AssignmentEvaluationStats>[]>(() => {
    // The whole dashboard arrives in one payload, so sorting is a navigation only because
    // the URL is where the sort lives — the rows themselves never leave the browser.
    function sortableHeader(
      field: EvaluationDashboardSortField,
      label: string,
      align: "start" | "end" = "start",
    ) {
      return () => (
        <SortHeader
          label={label}
          isActive={search.sort === field}
          order={search.order}
          align={align}
          onToggle={() =>
            navigate({
              search: (prev) => ({
                ...prev,
                sort: field,
                // Counts are most useful largest-first, names A-to-Z.
                order:
                  prev.sort === field
                    ? prev.order === "asc"
                      ? "desc"
                      : "asc"
                    : align === "end"
                      ? "desc"
                      : "asc",
              }),
            })
          }
        />
      )
    }

    function countColumn(
      status: "PASS" | "FAIL" | "DRAFT" | "PENDING",
      label: string,
    ): ColumnDef<typeof features, AssignmentEvaluationStats> {
      return {
        id: status,
        header: sortableHeader(status, label, "end"),
        cell: ({ row }) => (
          <div className="text-right">
            <EvaluationCountCell
              value={row.original.counts[status]}
              total={row.original.totalSubmitters}
              emphasize={status === "PENDING"}
            />
          </div>
        ),
      }
    }

    return [
      {
        id: "assignment",
        header: sortableHeader("assignment", "Assignment"),
        cell: ({ row }) => (
          <div className="flex min-w-56 flex-col">
            <BlueLink
              to="/course/$courseSlug/manage/evaluate/$sectionSlug"
              params={{
                courseSlug: row.original.courseSlug,
                sectionSlug: row.original.assignmentSlug,
              }}
              className="font-medium"
            >
              {row.original.assignmentTitle}
            </BlueLink>
            <span className="text-xs text-muted-foreground">{row.original.assignmentSlug}</span>
          </div>
        ),
      },
      {
        id: "course",
        header: sortableHeader("course", "Course"),
        cell: ({ row }) => (
          <BlueLink
            to="/course/$courseSlug/manage"
            params={{ courseSlug: row.original.courseSlug }}
            className="text-muted-foreground"
          >
            {row.original.courseTitle}
          </BlueLink>
        ),
      },
      {
        id: "totalSubmitters",
        header: sortableHeader("totalSubmitters", "Submitters", "end"),
        cell: ({ row }) => (
          <div className="text-right tabular-nums">
            {row.original.totalSubmitters.toLocaleString("en-US")}
          </div>
        ),
      },
      countColumn("PASS", "Pass"),
      countColumn("FAIL", "Fail"),
      countColumn("DRAFT", "Draft"),
      countColumn("PENDING", "Pending"),
      {
        id: "oldestPending",
        header: sortableHeader("oldestPending", "Waiting since", "end"),
        cell: ({ row }) => {
          const oldestPending = row.original.oldestPending
          if (!oldestPending) return <div className="text-right text-muted-foreground">—</div>
          return (
            <div className="text-right">
              <Tooltip>
                <TooltipTrigger className="cursor-default">
                  {/* Server and browser can land on either side of a minute boundary. */}
                  <span suppressHydrationWarning>{formatRelativeTime(oldestPending)}</span>
                </TooltipTrigger>
                <TooltipContent>{dateTimeFormatter.format(new Date(oldestPending))}</TooltipContent>
              </Tooltip>
            </div>
          )
        },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <IconButton
              tooltip="Evaluate pending submissions"
              render={
                <Link
                  to="/course/$courseSlug/manage/evaluate/$sectionSlug"
                  params={{
                    courseSlug: row.original.courseSlug,
                    sectionSlug: row.original.assignmentSlug,
                  }}
                  // Land in the queue an admin came here to work through.
                  search={{ status: ["PENDING"] }}
                  aria-label={`Evaluate ${row.original.assignmentTitle}`}
                />
              }
              nativeButton={false}
            >
              <ListChecks />
            </IconButton>
          </div>
        ),
      },
    ]
  }, [navigate, search.order, search.sort])

  const table = useTable({
    features,
    data: rows,
    columns,
    getRowId: (assignment) => String(assignment.sectionId),
  })

  if (!rows.length) {
    return (
      <p className="text-sm text-muted-foreground">
        {hasEvaluationDashboardFilters(search)
          ? "No assignments match these filters."
          : "No courses have assignments yet."}
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id} className="hover:bg-transparent">
            {headerGroup.headers.map((header, index) => (
              <TableHead
                key={header.id}
                className={cn(index === 0 && STICKY_COLUMN, index > 2 && "text-right")}
              >
                <table.FlexRender header={header} />
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          // The hover highlight moves onto the cells so the sticky first column, which needs
          // an opaque background of its own, highlights along with the rest of the row.
          <TableRow key={row.id} className="group/row hover:bg-transparent">
            {row.getAllCells().map((cell, index) => (
              <TableCell
                key={cell.id}
                className={cn("group-hover/row:bg-muted/50", index === 0 && STICKY_COLUMN)}
              >
                <table.FlexRender cell={cell} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/**
 * The dashboard is small enough to filter and sort in memory, so the loader never re-runs
 * for a filter change. The default sort ("course") keeps the order the loader built:
 * courses in their configured order, assignments in the order they appear in the course.
 */
function filterAndSort(
  assignments: AssignmentEvaluationStats[],
  search: EvaluationDashboardSearch,
): AssignmentEvaluationStats[] {
  const query = search.q.trim().toLowerCase()

  const filtered = assignments.filter((assignment) => {
    if (search.course !== "all" && assignment.courseSlug !== search.course) return false
    if (search.pendingOnly && !assignment.counts.PENDING) return false
    if (!query) return true
    return (
      assignment.assignmentTitle.toLowerCase().includes(query) ||
      assignment.assignmentSlug.toLowerCase().includes(query) ||
      assignment.courseTitle.toLowerCase().includes(query)
    )
  })

  if (search.sort === "course" && search.order === "asc") return filtered

  const direction = search.order === "asc" ? 1 : -1
  return [...filtered].sort((a, b) => {
    if (search.sort === "oldestPending") {
      // Assignments with nothing pending sort last whichever way the column points — an
      // empty queue is never the answer to "what has been waiting longest?".
      if (!a.oldestPending || !b.oldestPending) {
        return Number(!!b.oldestPending) - Number(!!a.oldestPending)
      }
      return direction * (new Date(a.oldestPending).getTime() - new Date(b.oldestPending).getTime())
    }
    return direction * compare(a, b, search.sort)
  })
}

function compare(
  a: AssignmentEvaluationStats,
  b: AssignmentEvaluationStats,
  sort: EvaluationDashboardSortField,
): number {
  switch (sort) {
    case "course":
      return a.courseTitle.localeCompare(b.courseTitle)
    case "assignment":
      return a.assignmentTitle.localeCompare(b.assignmentTitle)
    case "totalSubmitters":
      return a.totalSubmitters - b.totalSubmitters
    case "PASS":
    case "FAIL":
    case "DRAFT":
    case "PENDING":
      return a.counts[sort] - b.counts[sort]
    default:
      return 0
  }
}
