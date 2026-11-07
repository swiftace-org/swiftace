import type { NotebookOutput } from "@/types/notebook"

import { DisplayData } from "./display-data"
import { ErrorOut } from "./error-out"
import { StreamOut } from "./stream-out"

export function Output({
  output,
  markdownHtml,
}: {
  output: NotebookOutput
  markdownHtml?: string
}) {
  if (output.output_type === "error") return <ErrorOut output={output} />
  if (output.output_type === "stream") return <StreamOut output={output} />
  return <DisplayData output={output} markdownHtml={markdownHtml} />
}
