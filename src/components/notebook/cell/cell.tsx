import type { NotebookCell as NotebookCellData } from "@/types/notebook"

import { Input } from "./input"
import { Outputs } from "./outputs"

export function Cell({
  cell,
  cellIndex,
  markdownHtml,
}: {
  cell: NotebookCellData
  cellIndex: number
  markdownHtml: Record<string, string>
}) {
  return (
    <div className="p-2">
      <Input cell={cell} markdownHtml={markdownHtml[`cell-${cellIndex}`]} />
      <Outputs cell={cell} cellIndex={cellIndex} markdownHtml={markdownHtml} />
    </div>
  )
}
