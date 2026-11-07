import { getRouteApi } from "@tanstack/react-router"
import { tableFeatures, useTable, type ColumnDef } from "@tanstack/react-table"
import { useMemo } from "react"

import { BlueLink } from "@/components/blue-link"
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
import { formatRelativeTime } from "@/lib/utils"
import type {
  AssignmentSubmission,
  AssignmentSubmissionSortField,
  AssignmentSubmissionsSearch,
} from "@/types/evaluation"

import { hasAssignmentSubmissionFilters } from "../-lib/utils"
import { SubmissionDetails } from "../../../-components/submission-details"
import { SubmissionStatusBadge } from "../../../-components/submission-status-badge"
import { SubmissionActions } from "./submission-actions"

const evaluateRoute = getRouteApi("/course/$courseSlug_/manage/evaluate/$sectionSlug/")

// Sorting and paging happen in the database, so the table registers no features.
const features = tableFeatures({})

const dateTimeFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
})

export function SubmissionsTable({
  submissions,
  search,
}: {
  submissions: AssignmentSubmission[]
  search: AssignmentSubmissionsSearch
}) {
  const navigate = evaluateRoute.useNavigate()

  const columns = useMemo<ColumnDef<typeof features, AssignmentSubmission>[]>(() => {
    // Sorting is applied in the database, so a header click is a navigation. Clicking the
    // column that is already sorted flips the direction; a new column starts ascending.
    function sortableHeader(field: AssignmentSubmissionSortField, label: string) {
      return () => (
        <SortHeader
          label={label}
          isActive={search.sort === field}
          order={search.order}
          onToggle={() =>
            navigate({
              search: (prev) => ({
                ...prev,
                sort: field,
                order: prev.sort === field && prev.order === "asc" ? "desc" : "asc",
                page: 1,
              }),
            })
          }
        />
      )
    }

    return [
      {
        id: "submitter",
        header: sortableHeader("username", "Submitter"),
        cell: ({ row }) => (
          <div className="flex w-40 flex-col break-words whitespace-normal">
            <BlueLink
              to="/manage/users/$userId"
              params={{ userId: String(row.original.submitter.accountId) }}
              className="block font-medium"
            >
              {row.original.submitter.name}
            </BlueLink>
            <span className="text-xs text-muted-foreground">
              @{row.original.submitter.username}
            </span>
            <span className="text-xs break-all text-muted-foreground">
              {row.original.submitter.email}
            </span>
          </div>
        ),
      },
      {
        id: "submission",
        header: "Submission",
        cell: ({ row }) => (
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Submission ID
              </p>
              <p className="text-sm">{row.original.id}</p>
            </div>
            <SubmissionDetails fields={row.original.fields} />
          </div>
        ),
      },
      {
        id: "submittedAt",
        header: sortableHeader("submittedAt", "Submitted"),
        cell: ({ row }) => (
          <Tooltip>
            <TooltipTrigger className="cursor-default text-sm whitespace-nowrap text-muted-foreground">
              {/* Server and browser can land on either side of a minute boundary. */}
              <span suppressHydrationWarning>{formatRelativeTime(row.original.submittedAt)}</span>
            </TooltipTrigger>
            <TooltipContent>
              {dateTimeFormatter.format(new Date(row.original.submittedAt))}
            </TooltipContent>
          </Tooltip>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => <SubmissionStatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: "Evaluate",
        cell: ({ row }) => <SubmissionActions submission={row.original} />,
      },
    ]
  }, [navigate, search.order, search.sort])

  const table = useTable({
    features,
    data: submissions,
    columns,
    getRowId: (submission) => String(submission.id),
  })

  if (!submissions.length) {
    return (
      <p className="text-sm text-muted-foreground">
        {hasAssignmentSubmissionFilters(search)
          ? "No submissions match these filters."
          : "Nobody has submitted this assignment yet."}
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id} className="hover:bg-transparent">
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id}>
                <table.FlexRender header={header} />
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getAllCells().map((cell) => (
              // Rows are as tall as their answers, so everything hangs off the top edge.
              <TableCell key={cell.id} className="py-4 align-top">
                <table.FlexRender cell={cell} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
