import { code } from "@streamdown/code"
import { memo } from "react"
import rehypeKatex from "rehype-katex"
import remarkMath from "remark-math"
import { type Components, type MathPlugin, Streamdown } from "streamdown"

import { BlueLink } from "@/components/blue-link"
import { cn } from "@/lib/utils"

import { normalizeMathDelimiters } from "../-lib/ai-tutor"

/** The site's own KaTeX, whose stylesheet the course pages already load, rather than Streamdown's. */
const math: MathPlugin = {
  name: "katex",
  type: "math",
  remarkPlugin: [remarkMath, { singleDollarTextMath: true }],
  rehypePlugin: [rehypeKatex, { errorColor: "var(--muted-foreground)" }],
}

const plugins = { code, math }

/** Links into the course stay in the app, beside the panel; the rest open in a new tab. */
const components: Components = {
  a: ({ href, children }) =>
    href?.startsWith("/") ? (
      <BlueLink to={href} colored>
        {children}
      </BlueLink>
    ) : (
      <BlueLink external colored href={href} target="_blank" rel="noreferrer">
        {children}
      </BlueLink>
    ),
}

/** A tutor reply, which may still be streaming in: unfinished markdown renders as it will end up. */
export const AiTutorMarkdown = memo(function AiTutorMarkdown({
  markdown,
  isStreaming,
  className,
}: {
  markdown: string
  isStreaming: boolean
  className?: string
}) {
  return (
    <Streamdown
      className={cn("ai-tutor-markdown min-w-0 text-sm leading-relaxed", className)}
      mode={isStreaming ? "streaming" : "static"}
      isAnimating={isStreaming}
      plugins={plugins}
      components={components}
      linkSafety={{ enabled: false }}
      controls={{ table: false }}
      lineNumbers={false}
      codeBlockMaxHeight={320}
    >
      {normalizeMathDelimiters(markdown)}
    </Streamdown>
  )
})
