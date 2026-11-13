import { useSiteConfig } from "@/lib/hooks"

import * as m from "../mime-types"
import { stringify } from "../stringify"
import { Html } from "./html"
import { HtmlIframe, isScriptOnlyHtml, plotlyFigureToHtml } from "./html-iframe"
import { Image } from "./image"
import { Javascript } from "./javascript"
import { Json } from "./json"
import { Markdown } from "./markdown"
import { PlainText } from "./plain-text"

const IMAGE_TYPES: string[] = [m.IMAGE_GIF, m.IMAGE_JPEG, m.IMAGE_JPG, m.IMAGE_PNG]

export function Media({
  type,
  data,
  metadata,
  className,
  markdownHtml,
}: {
  type: string
  data: unknown
  metadata?: { width?: number; height?: number }
  className?: string
  /** Pre-rendered HTML for this output, when `type` is text/markdown. */
  markdownHtml?: string
}) {
  const { enabled, url } = useSiteConfig().notebookPreview
  const richPreviews = enabled && !!url
  switch (type) {
    case m.TEXT:
      return <PlainText data={data as string | string[]} className={className} />
    case m.PLOTLY_JSON:
      return richPreviews ? (
        <HtmlIframe html={plotlyFigureToHtml(data)} />
      ) : (
        <PlainText data="Interactive output preview is disabled." />
      )
    case m.HTML: {
      const html = stringify(data as string | string[])
      if (!richPreviews || !isPlotlyHtml(html)) return <Html data={html} />
      return isScriptOnlyHtml(html) ? null : <HtmlIframe html={html} />
    }
    case m.IMAGE_SVG:
      return <Html data={data as string | string[]} />
    case m.MARKDOWN:
      return <Markdown html={markdownHtml} />
    case m.APP_JSON:
      return <Json data={data} />
    case m.TEXT_JS:
      return <Javascript data={data as string | string[]} />
    default:
      if (IMAGE_TYPES.includes(type)) {
        return <Image type={type} data={data as string} metadata={metadata} className={className} />
      }
      // text/latex and anything else unsupported (no katex rendering ported) falls back to plain text.
      return <PlainText data={data as string | string[]} className={className} />
  }
}

// Other scripted output, like Colab's dataframe buttons, still reads fine with its script stripped.
function isPlotlyHtml(html: string) {
  return /<script/i.test(html) && /plotly/i.test(html)
}
