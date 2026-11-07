import { cn } from "@/lib/utils"
import type { NotebookOutput } from "@/types/notebook"

import { Ansi } from "../ansi"

export function StreamOut({ output }: { output: NotebookOutput }) {
  const text = output.text
  return (
    <div
      className={cn(
        "flex-1 py-1 px-1 lg:px-0",
        output.name === "stderr" && "bg-red-200 dark:bg-red-900",
      )}
    >
      <Ansi>{typeof text === "string" ? text : (text ?? []).join("")}</Ansi>
    </div>
  )
}
