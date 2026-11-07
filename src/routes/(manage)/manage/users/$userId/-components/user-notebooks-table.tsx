import { ExternalLink } from "lucide-react"

import { BlueLink } from "@/components/blue-link"
import type { ManagedUserNotebook } from "@/types/user"

import { formatDate } from "../../-lib/utils"
import { UserDetailTable, type UserDetailColumn } from "./user-detail-table"

export function UserNotebooksTable({
  notebooks,
  totalNotebooks,
  username,
}: {
  notebooks: ManagedUserNotebook[]
  totalNotebooks: number
  username: string
}) {
  const columns: UserDetailColumn<ManagedUserNotebook>[] = [
    {
      id: "title",
      header: "Notebook",
      cell: ({ row }) => (
        // Notebooks still live on the legacy app, which the reverse proxy sends these paths on to.
        <BlueLink
          external
          href={`/${username}/${row.original.title}`}
          target="_blank"
          className="gap-1 font-medium break-all"
        >
          {row.original.title}
          <ExternalLink className="size-3 shrink-0" />
        </BlueLink>
      ),
    },
    {
      id: "visibility",
      header: "Visibility",
      cell: ({ row }) => (
        <span className="text-muted-foreground capitalize">
          {row.original.visibility?.toLowerCase() ?? "—"}
        </span>
      ),
    },
    {
      id: "createdAt",
      header: "Created",
      className: "whitespace-nowrap",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{formatDate(row.original.createdAt)}</span>
      ),
    },
    {
      id: "updatedAt",
      header: "Updated",
      className: "whitespace-nowrap",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{formatDate(row.original.updatedAt)}</span>
      ),
    },
  ]

  return (
    <div className="space-y-3">
      <UserDetailTable
        data={notebooks}
        columns={columns}
        getRowId={(notebook) => String(notebook.id)}
        emptyMessage="No notebooks."
      />
      {totalNotebooks > notebooks.length ? (
        <p className="text-sm text-muted-foreground">
          Showing the {notebooks.length} most recently updated of{" "}
          {totalNotebooks.toLocaleString("en-US")} notebooks.
        </p>
      ) : null}
    </div>
  )
}
