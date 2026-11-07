import { getRouteApi } from "@tanstack/react-router"
import {
  functionalUpdate,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
  type Updater,
} from "@tanstack/react-table"
import { useMemo } from "react"

import { BlueLink } from "@/components/blue-link"
import { SortHeader } from "@/components/sort-header"
import { TablePagination } from "@/components/table-pagination"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { ManagedUserListRow, ManageUsersPage, ManageUsersSearch } from "@/types/user"

import {
  MANAGE_USERS_SORT_VALUES,
  PAGE_GUTTER,
  PAGE_GUTTER_LEFT,
  USERS_PER_PAGE_OPTIONS,
} from "../-lib/constants"
import { defaultSortOrder, hasManageUsersFilters } from "../-lib/utils"
import { CopyEmailButton } from "./copy-email-button"
import { SubscriptionPlanBadge } from "./subscription-plan-badge"
import { UserAvatar } from "./user-avatar"
import { UserEnrollmentsCell } from "./user-enrollments-cell"
import { UserRoleBadges } from "./user-role-badges"
import { UtcDateTime } from "./utc-date-time"

const usersRoute = getRouteApi("/(manage)/manage/users/")

// Sorting and paging happen in the database: the table owns the state shape and the header
// and pager behaviour, while the URL owns the values.
const features = tableFeatures({ rowSortingFeature, rowPaginationFeature })

/** Keeps the name column in place while the rest of the table scrolls sideways. */
const STICKY_COLUMN = cn("sticky left-0 z-10 bg-background", PAGE_GUTTER_LEFT)

/** Narrow screens fold the email into the name cell instead of its own column. */
const COLUMN_CLASSES: Record<string, string> = {
  email: "hidden md:table-cell",
  // Hidden on phones, which hands the right gutter to "Signed up".
  lastActive: "hidden lg:table-cell",
  plan: "hidden sm:table-cell",
  enrollments: "hidden text-right sm:table-cell sm:pr-6 lg:pr-8",
  createdAt: "max-sm:pr-4",
}

export function UsersTable({ page, search }: { page: ManageUsersPage; search: ManageUsersSearch }) {
  const navigate = usersRoute.useNavigate()

  const columns = useMemo<ColumnDef<typeof features, ManagedUserListRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-3">
            <UserAvatar name={row.original.name || row.original.email} />
            <div className="flex min-w-0 flex-col">
              <span className="flex items-center gap-1.5">
                <BlueLink
                  to="/manage/users/$userId"
                  params={{ userId: String(row.original.id) }}
                  className="truncate font-medium"
                >
                  {row.original.name || "Unnamed"}
                </BlueLink>
                <UserRoleBadges user={row.original} />
              </span>
              <span className="truncate text-xs text-muted-foreground">
                <span className="tabular-nums">{row.original.id}</span>
                {row.original.username ? ` · ${row.original.username}` : null}
              </span>
              <span className="flex min-w-0 items-center gap-0.5 text-xs text-muted-foreground md:hidden">
                <BlueLink external href={`mailto:${row.original.email}`} className="truncate">
                  {row.original.email}
                </BlueLink>
                <CopyEmailButton email={row.original.email} />
              </span>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
          <span className="flex items-center gap-1 text-muted-foreground">
            <BlueLink external href={`mailto:${row.original.email}`}>
              {row.original.email}
            </BlueLink>
            <CopyEmailButton email={row.original.email} />
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Signed up (UTC)",
        sortDescFirst: true,
        cell: ({ row }) => (
          <UtcDateTime
            value={row.original.createdAt}
            className="inline-block max-w-28 whitespace-normal text-muted-foreground tabular-nums sm:max-w-none sm:whitespace-nowrap"
          />
        ),
      },
      {
        id: "lastActive",
        header: "Last active (UTC)",
        enableSorting: false,
        cell: ({ row }) => (
          <UtcDateTime
            value={row.original.lastActiveAt}
            className="whitespace-nowrap text-muted-foreground tabular-nums"
          />
        ),
      },
      {
        id: "plan",
        header: "Subscription",
        enableSorting: false,
        cell: ({ row }) => (
          <SubscriptionPlanBadge
            plan={row.original.plan}
            subscription={row.original.subscription}
          />
        ),
      },
      {
        id: "enrollments",
        header: "Enrollments",
        enableSorting: false,
        cell: ({ row }) => <UserEnrollmentsCell enrollments={row.original.enrollments} />,
      },
    ],
    [],
  )

  const sorting: SortingState = [{ id: search.sort, desc: search.order === "desc" }]
  const pagination: PaginationState = { pageIndex: search.page - 1, pageSize: search.perPage }

  function onSortingChange(updater: Updater<SortingState>) {
    const [next] = functionalUpdate(updater, sorting)
    const sort = MANAGE_USERS_SORT_VALUES.find((value) => value === next?.id) ?? search.sort
    const order = next ? (next.desc ? "desc" : "asc") : defaultSortOrder(sort)
    void navigate({ search: (prev) => ({ ...prev, sort, order, page: 1 }) })
  }

  function onPaginationChange(updater: Updater<PaginationState>) {
    const next = functionalUpdate(updater, pagination)
    void navigate({
      search: (prev) => ({ ...prev, page: next.pageIndex + 1, perPage: next.pageSize }),
    })
  }

  const table = useTable({
    features,
    data: page.users,
    columns,
    getRowId: (user) => String(user.id),
    state: { sorting, pagination },
    onSortingChange,
    onPaginationChange,
    manualSorting: true,
    manualPagination: true,
    enableMultiSort: false,
    enableSortingRemoval: false,
    rowCount: page.totalUsers,
  })

  return (
    <div className="space-y-4">
      {page.users.length ? (
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header, index) => {
                  const sorted = header.column.getIsSorted()
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(index === 0 && STICKY_COLUMN, COLUMN_CLASSES[header.id])}
                    >
                      {header.column.getCanSort() ? (
                        <SortHeader
                          label={String(header.column.columnDef.header)}
                          isActive={!!sorted}
                          order={sorted || "asc"}
                          onToggle={() => header.column.toggleSorting()}
                        />
                      ) : (
                        <table.FlexRender header={header} />
                      )}
                    </TableHead>
                  )
                })}
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
                    className={cn(
                      "group-hover/row:bg-muted/50",
                      index === 0 && cn(STICKY_COLUMN, "max-w-[60vw] md:max-w-none"),
                      COLUMN_CLASSES[cell.column.id],
                    )}
                  >
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className={cn("py-8 text-center text-sm text-muted-foreground", PAGE_GUTTER)}>
          {hasManageUsersFilters(search) ? "No users match these filters." : "No users yet."}
        </p>
      )}
      <div className={PAGE_GUTTER}>
        <TablePagination
          page={table.state.pagination.pageIndex + 1}
          perPage={table.state.pagination.pageSize}
          perPageOptions={USERS_PER_PAGE_OPTIONS}
          totalPages={table.getPageCount()}
          totalRows={page.totalUsers}
          rowLabel="users"
          onPageChange={(nextPage) => table.setPageIndex(nextPage - 1)}
          onPerPageChange={(perPage) => table.setPageSize(perPage)}
        />
      </div>
    </div>
  )
}
