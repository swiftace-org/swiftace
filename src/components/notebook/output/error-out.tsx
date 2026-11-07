import type { NotebookOutput } from "@/types/notebook"

import { Ansi } from "../ansi"

export function ErrorOut({ output }: { output: NotebookOutput }) {
  const content = output.traceback
    ? output.traceback.join("\n")
    : `${output.ename}: ${output.evalue}`
  return <Ansi>{content}</Ansi>
}
