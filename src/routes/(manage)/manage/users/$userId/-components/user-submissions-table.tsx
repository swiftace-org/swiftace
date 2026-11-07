import { Link } from "@tanstack/react-router"
import { ListChecks } from "lucide-react"

import { BlueLink } from "@/components/blue-link"
import { IconButton } from "@/components/icon-button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { ManagedUserSubmission } from "@/types/user"

import { UtcDateTime } from "../../-components/utc-date-time"
import { SubmissionStatusBadge } from "../../../../../course/-components/submission-status-badge"
import { UserDetailTable, type UserDetailColumn } from "./user-detail-table"

export function UserSubmissionsTable({
  submissions,
  email,
}: {
  submissions: ManagedUserSubmission[]
  email: string
}) {
  const columns: UserDetailColumn<ManagedUserSubmission>[] = [
    {
      id: "assignment",
      header: "Assignment",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <BlueLink
            to="/course/$courseSlug/assignment/$sectionSlug"
            params={{
              courseSlug: row.original.courseSlug,
              sectionSlug: row.original.assignmentSlug,
            }}
            className="font-medium"
          >
            {row.original.assignmentTitle}
          </BlueLink>
          <span className="text-xs text-muted-foreground">{row.original.courseTitle}</span>
        </div>
      ),
    },
    {
      id: "submittedAt",
      header: "Submitted (UTC)",
      className: "whitespace-nowrap",
      cell: ({ row }) => (
        <UtcDateTime value={row.original.submittedAt} className="text-muted-foreground" />
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => <SubmissionStatusBadge status={row.original.status} />,
    },
    {
      id: "evaluation",
      header: "Evaluation",
      cell: ({ row }) => {
        const { evaluator, evaluatedAt, comments } = row.original
        if (!evaluatedAt) return <span className="text-muted-foreground">—</span>
        return (
          <div className="flex max-w-xs flex-col text-xs">
            <span className="whitespace-nowrap text-muted-foreground">
              {evaluator ? `${evaluator.name} · ` : ""}
              <UtcDateTime withZone value={evaluatedAt} />
            </span>
            {comments ? (
              <Tooltip>
                <TooltipTrigger className="cursor-default truncate text-left">
                  {comments}
                </TooltipTrigger>
                <TooltipContent className="max-w-sm whitespace-pre-wrap">{comments}</TooltipContent>
              </Tooltip>
            ) : null}
          </div>
        )
      },
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      className: "w-10 text-right",
      cell: ({ row }) => (
        <IconButton
          tooltip="Open in evaluation"
          render={
            <Link
              to="/course/$courseSlug/manage/evaluate/$sectionSlug"
              params={{
                courseSlug: row.original.courseSlug,
                sectionSlug: row.original.assignmentSlug,
              }}
              search={{ q: email }}
            />
          }
          nativeButton={false}
        >
          <ListChecks />
        </IconButton>
      ),
    },
  ]

  return (
    <UserDetailTable
      data={submissions}
      columns={columns}
      getRowId={(submission) => String(submission.id)}
      emptyMessage="No assignment submissions."
    />
  )
}
