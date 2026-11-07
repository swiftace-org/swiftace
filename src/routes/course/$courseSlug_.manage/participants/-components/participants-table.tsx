import { getRouteApi } from "@tanstack/react-router"
import { tableFeatures, useTable, type ColumnDef } from "@tanstack/react-table"
import { ExternalLink } from "lucide-react"
import { useMemo } from "react"

import { BlueLink } from "@/components/blue-link"
import { SortHeader } from "@/components/sort-header"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type {
  CourseParticipant,
  CourseParticipantSortField,
  CourseParticipantsPage,
  CourseParticipantsSearch,
} from "@/types/participant"

import { COURSE_CERTIFICATION_STATUS_REVOKED } from "../-lib/constants"
import { hasCourseParticipantFilters } from "../-lib/utils"
import { ParticipantActions } from "./participant-actions"
import { SectionProgress } from "./section-progress"

const participantsRoute = getRouteApi("/course/$courseSlug_/manage/participants/")

// Sorting, filtering and paging happen in the database, so the table registers no features.
const features = tableFeatures({})

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium" })

/** Keeps the name column in place while the rest of the table scrolls sideways. */
const STICKY_COLUMN = "sticky left-0 z-10 bg-background"

export function ParticipantsTable({
  courseSlug,
  courseTitle,
  page,
  search,
}: {
  courseSlug: string
  courseTitle: string
  page: CourseParticipantsPage
  search: CourseParticipantsSearch
}) {
  const navigate = participantsRoute.useNavigate()

  const columns = useMemo<ColumnDef<typeof features, CourseParticipant>[]>(() => {
    // Sorting is applied in the database, so a header click is a navigation. Clicking the
    // column that is already sorted flips the direction; a new column starts ascending.
    function sortableHeader(field: CourseParticipantSortField, label: string) {
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
        accessorKey: "name",
        header: sortableHeader("name", "Name"),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="flex items-center gap-1.5 font-medium">
              {row.original.name}
              {row.original.isStaff ? <Badge variant="secondary">Staff</Badge> : null}
            </span>
            <span className="text-xs text-muted-foreground">@{row.original.username}</span>
          </div>
        ),
      },
      {
        accessorKey: "email",
        header: sortableHeader("email", "Email"),
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span>,
      },
      {
        accessorKey: "enrolledAt",
        header: sortableHeader("enrolledAt", "Enrolled"),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {dateFormatter.format(new Date(row.original.enrolledAt))}
          </span>
        ),
      },
      {
        accessorKey: "completedLessons",
        header: "Lessons",
        cell: ({ row }) => (
          <SectionProgress completed={row.original.completedLessons} total={page.totalLessons} />
        ),
      },
      {
        accessorKey: "completedAssignments",
        header: "Assignments",
        cell: ({ row }) => (
          <SectionProgress
            completed={row.original.completedAssignments}
            total={page.totalAssignments}
          />
        ),
      },
      {
        id: "certificate",
        header: "Certificate",
        cell: ({ row }) => {
          if (row.original.certificateSlug) {
            return (
              <BlueLink
                to="/certificate/$certificateSlug"
                params={{ certificateSlug: row.original.certificateSlug }}
                target="_blank"
                className="gap-1"
              >
                View
                <ExternalLink className="size-3.5" />
              </BlueLink>
            )
          }
          // A revoked certificate is worth calling out — the row exists, it just can't be linked.
          return (
            <span className="text-muted-foreground">
              {row.original.certificationStatus === COURSE_CERTIFICATION_STATUS_REVOKED
                ? "Revoked"
                : "—"}
            </span>
          )
        },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <ParticipantActions
            courseSlug={courseSlug}
            courseTitle={courseTitle}
            participant={row.original}
          />
        ),
      },
    ]
  }, [
    courseSlug,
    courseTitle,
    navigate,
    page.totalAssignments,
    page.totalLessons,
    search.order,
    search.sort,
  ])

  const table = useTable({
    features,
    data: page.participants,
    columns,
    getRowId: (participant) => String(participant.accountId),
  })

  if (!page.participants.length) {
    return (
      <p className="text-sm text-muted-foreground">
        {hasCourseParticipantFilters(search)
          ? "No participants match these filters."
          : "Nobody has joined this course yet."}
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
                className={cn(
                  index === 0 && STICKY_COLUMN,
                  header.id === "actions" && "text-right",
                )}
              >
                <table.FlexRender header={header} />
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          // The hover highlight moves onto the cells so the sticky name column, which needs
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
