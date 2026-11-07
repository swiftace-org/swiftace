import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

import { IconButton } from "@/components/icon-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/**
 * Page controls for the admin tables. Paging happens in the database, so the caller turns
 * these callbacks into navigations and the numbers come from the loader.
 */
export function TablePagination({
  page,
  perPage,
  perPageOptions,
  totalPages,
  totalRows,
  rowLabel,
  onPageChange,
  onPerPageChange,
}: {
  page: number
  perPage: number
  perPageOptions: number[]
  totalPages: number
  totalRows: number
  /** Plural noun for the row count, e.g. "participants". */
  rowLabel: string
  onPageChange: (page: number) => void
  onPerPageChange: (perPage: number) => void
}) {
  const lastPage = Math.max(1, totalPages)
  // A hand-edited `?page=` or a filter that just shrank the results can point past the end.
  const currentPage = Math.min(page, lastPage)
  const firstRow = (currentPage - 1) * perPage + 1
  const lastRow = Math.min(currentPage * perPage, totalRows)

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Label htmlFor="per-page" className="font-normal text-muted-foreground">
          Rows per page
        </Label>
        <Select
          items={Object.fromEntries(perPageOptions.map((size) => [String(size), String(size)]))}
          value={String(perPage)}
          onValueChange={(value) => onPerPageChange(Number(value))}
        >
          <SelectTrigger id="per-page" size="sm" className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {perPageOptions.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <p className="text-sm text-muted-foreground tabular-nums">
        {totalRows
          ? `${firstRow}–${lastRow} of ${totalRows.toLocaleString("en-US")} ${rowLabel}`
          : `No ${rowLabel}`}
      </p>
      <div className="flex items-center gap-1">
        <IconButton
          tooltip="First page"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(1)}
        >
          <ChevronsLeft />
        </IconButton>
        <IconButton
          tooltip="Previous page"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft />
        </IconButton>
        <div className="flex items-center gap-1.5 px-1 text-sm tabular-nums">
          <span className="sr-only sm:not-sr-only">Page</span>
          {/* Keyed on the page so the box resets whenever the page changes from elsewhere. */}
          <PageNumberInput
            key={currentPage}
            page={currentPage}
            lastPage={lastPage}
            onPageChange={onPageChange}
          />
          <span className="whitespace-nowrap">of {lastPage.toLocaleString("en-US")}</span>
        </div>
        <IconButton
          tooltip="Next page"
          disabled={currentPage >= lastPage}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <ChevronRight />
        </IconButton>
        <IconButton
          tooltip="Last page"
          disabled={currentPage >= lastPage}
          onClick={() => onPageChange(lastPage)}
        >
          <ChevronsRight />
        </IconButton>
      </div>
    </div>
  )
}

/** Jumps straight to a page on Enter or blur; anything out of range is pulled back into it. */
function PageNumberInput({
  page,
  lastPage,
  onPageChange,
}: {
  page: number
  lastPage: number
  onPageChange: (page: number) => void
}) {
  function commit(input: HTMLInputElement) {
    const requested = Math.trunc(Number(input.value))
    if (!Number.isFinite(requested) || !input.value.trim()) {
      input.value = String(page)
      return
    }
    const next = Math.min(Math.max(requested, 1), lastPage)
    input.value = String(next)
    if (next !== page) onPageChange(next)
  }

  return (
    <Input
      type="number"
      inputMode="numeric"
      min={1}
      max={lastPage}
      defaultValue={page}
      aria-label="Page number"
      className="h-8 w-16 [appearance:textfield] px-2 text-center tabular-nums [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      onKeyDown={(event) => {
        if (event.key === "Enter") commit(event.currentTarget)
      }}
      onBlur={(event) => commit(event.currentTarget)}
    />
  )
}
