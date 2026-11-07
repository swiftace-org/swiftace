import type { NotebookOutput } from "@/types/notebook"

import { Media } from "../media/media"
import { DISPLAY_ORDER } from "../mime-types"

export function DisplayData({
  output,
  className,
  markdownHtml,
}: {
  output: NotebookOutput
  className?: string
  markdownHtml?: string
}) {
  const data = output.data ?? {}
  for (const mimeType of DISPLAY_ORDER) {
    if (mimeType in data) {
      return (
        <Media
          type={mimeType}
          data={data[mimeType]}
          metadata={output.metadata?.[mimeType] as { width?: number; height?: number } | undefined}
          className={className}
          markdownHtml={markdownHtml}
        />
      )
    }
  }
  return null
}
