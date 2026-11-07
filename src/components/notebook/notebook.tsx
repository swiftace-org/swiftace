import { convertNotebook } from "@/lib/utils"
import type { NotebookJson } from "@/types/notebook"

import { Cell } from "./cell/cell"

export function Notebook({
  source,
  markdownHtml,
}: {
  source: NotebookJson
  markdownHtml: Record<string, string>
}) {
  const data = convertNotebook(source)
  if (!data.cells) return null

  return (
    <div>
      {data.cells.map((cell, i) => (
        <Cell key={i} cell={cell} cellIndex={i} markdownHtml={markdownHtml} />
      ))}
    </div>
  )
}
