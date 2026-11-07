import type { NotebookCell } from "@/types/notebook"

import { Prompt } from "./prompt"
import { Source } from "./source"

export function Input({
  cell,
  hidePrompt = true,
  markdownHtml,
}: {
  cell: NotebookCell
  hidePrompt?: boolean
  markdownHtml?: string
}) {
  if (cell.source === null || cell.source === undefined) return null

  return (
    <div className="box-border w-full flex-col items-start lg:flex lg:flex-row">
      {!hidePrompt && (
        <Prompt
          blank={cell.cell_type !== "code"}
          count={cell.execution_count ?? " "}
          className="pt-px"
        />
      )}
      <Source type={cell.cell_type} source={cell.source} markdownHtml={markdownHtml} />
    </div>
  )
}
