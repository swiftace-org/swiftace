import { tableFeatures, useTable, type ColumnDef, type RowData } from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

// One account's rows arrive whole and already in order, so the tables register no features.
export const userDetailFeatures = tableFeatures({})

export type UserDetailColumn<TData extends RowData> = ColumnDef<
  typeof userDetailFeatures,
  TData
> & {
  /** Applied to the header and every cell, for alignment and hiding columns on narrow screens. */
  className?: string
}

/**
 * The tables on a user's page. The first column stays put while the rest scroll sideways, so
 * a phone still shows what each row is about.
 */
export function UserDetailTable<TData extends RowData>({
  data,
  columns,
  getRowId,
  emptyMessage,
}: {
  data: TData[]
  columns: UserDetailColumn<TData>[]
  getRowId: (row: TData) => string
  emptyMessage: string
}) {
  const table = useTable({ features: userDetailFeatures, data, columns, getRowId })

  if (!data.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>
  }

  const classNameFor = (index: number) => columns[index]?.className

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id} className="hover:bg-transparent">
            {headerGroup.headers.map((header, index) => (
              <TableHead
                key={header.id}
                className={cn(index === 0 && STICKY_COLUMN, classNameFor(index))}
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
                className={cn(
                  "group-hover/row:bg-muted/50",
                  index === 0 &&
                    cn(STICKY_COLUMN, "max-w-[65vw] min-w-40 whitespace-normal sm:max-w-none"),
                  classNameFor(index),
                )}
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

const STICKY_COLUMN = "sticky left-0 z-10 bg-background"
