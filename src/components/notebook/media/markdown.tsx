import { Markdown as RenderedMarkdown } from "@/components/markdown"

export function Markdown({ html }: { html?: string }) {
  if (!html) return null
  // A flex item in the cell's input row: without `w-full` it shrinks to its content, which
  // collapses a slide embed to the iframe's default 300px.
  return <RenderedMarkdown markup={html} className="w-full min-w-0" />
}
