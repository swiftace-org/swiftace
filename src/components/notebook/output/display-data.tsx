import { useSiteConfig } from "@/lib/hooks"
import type { NotebookOutput } from "@/types/notebook"

import { Media } from "../media/media"
import { DISPLAY_ORDER, PLOTLY_JSON } from "../mime-types"

export function DisplayData({
  output,
  className,
  markdownHtml,
}: {
  output: NotebookOutput
  className?: string
  markdownHtml?: string
}) {
  const { enabled, url } = useSiteConfig().notebookPreview
  const data = output.data ?? {}
  for (const mimeType of DISPLAY_ORDER) {
    if (mimeType === PLOTLY_JSON && (!enabled || !url) && Object.keys(data).length > 1) continue
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
