import type { NotebookCell } from "@/types/notebook"

import { Output } from "../output/output"
import { Prompt } from "./prompt"

const MAX_OUTPUT_HEIGHT = "640px"

export function Outputs({
  cell,
  cellIndex,
  markdownHtml,
  hidePrompt = true,
}: {
  cell: NotebookCell
  cellIndex: number
  markdownHtml: Record<string, string>
  hidePrompt?: boolean
}) {
  if (!cell.outputs || cell.outputs.length === 0) return null

  return (
    <div className="overflow-y-auto pt-px" style={{ maxHeight: MAX_OUTPUT_HEIGHT }}>
      {cell.outputs.map((output, outputIndex) => (
        <div
          className="box-border w-full flex-col items-start lg:flex lg:flex-row"
          key={outputIndex}
        >
          {!hidePrompt && (
            <Prompt
              blank={output.output_type !== "execute_result"}
              count={cell.execution_count}
              out
              className="pt-px"
            />
          )}
          <div
            className={
              "flex flex-1 overflow-auto" +
              (output.output_type === "execute_result" ? " py-1 px-1 lg:px-0" : "")
            }
          >
            <Output
              output={output}
              markdownHtml={markdownHtml[`cell-${cellIndex}-output-${outputIndex}`]}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
