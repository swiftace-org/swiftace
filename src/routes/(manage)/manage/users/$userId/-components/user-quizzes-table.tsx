import { BlueLink } from "@/components/blue-link"
import type { ManagedUserQuizSummary } from "@/types/user"

import { UtcDateTime } from "../../-components/utc-date-time"
import { UserDetailTable, type UserDetailColumn } from "./user-detail-table"

const columns: UserDetailColumn<ManagedUserQuizSummary>[] = [
  {
    id: "quiz",
    header: "Quiz",
    cell: ({ row }) => (
      <BlueLink
        to="/manage/quizzes/$quizSlug"
        params={{ quizSlug: row.original.quizSlug }}
        className="font-medium"
      >
        {row.original.quizTitle}
      </BlueLink>
    ),
  },
  {
    id: "answered",
    header: "Answers",
    className: "text-right tabular-nums",
    cell: ({ row }) => row.original.answered.toLocaleString("en-US"),
  },
  {
    id: "correct",
    header: "Correct",
    className: "text-right tabular-nums",
    cell: ({ row }) => (
      <span>
        {row.original.correct.toLocaleString("en-US")}{" "}
        <span className="text-muted-foreground">
          ({Math.round((row.original.correct / Math.max(1, row.original.answered)) * 100)}%)
        </span>
      </span>
    ),
  },
  {
    id: "firstAttemptAt",
    header: "First answer (UTC)",
    className: "whitespace-nowrap",
    cell: ({ row }) => (
      <UtcDateTime value={row.original.firstAttemptAt} className="text-muted-foreground" />
    ),
  },
  {
    id: "lastAttemptAt",
    header: "Last answer (UTC)",
    className: "whitespace-nowrap",
    cell: ({ row }) => (
      <UtcDateTime value={row.original.lastAttemptAt} className="text-muted-foreground" />
    ),
  },
]

export function UserQuizzesTable({ quizzes }: { quizzes: ManagedUserQuizSummary[] }) {
  return (
    <UserDetailTable
      data={quizzes}
      columns={columns}
      getRowId={(quiz) => quiz.quizSlug}
      emptyMessage="Hasn't answered any quiz questions."
    />
  )
}
