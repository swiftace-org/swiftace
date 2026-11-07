import { lazy, Suspense } from "react"
import { useTheme } from "tanstack-router-theme-provider"

import { joinSource } from "@/lib/utils"

import { Markdown } from "../media/markdown"
import { docco } from "./docco"

const SyntaxHighlighter = lazy(() => import("./syntax-highlighter"))

const wrapperClassName =
  "border border-solid border-gray-300 dark:border-gray-600 rounded-sm font-mono text-sm overflow-auto text-gray-900 dark:text-gray-100 box-border w-full leading-5"

export function Source({
  type,
  source,
  markdownHtml,
}: {
  type: string
  source: string | string[]
  /** Pre-rendered HTML, present when `type === "markdown"`. */
  markdownHtml?: string
}) {
  const { resolvedTheme } = useTheme()

  if (type === "markdown") {
    return <Markdown html={markdownHtml} />
  }

  const language = type === "code" ? "python" : "text"
  const code = joinSource(source) || " "

  return (
    <div className={wrapperClassName} style={{ fontSize: 14 }}>
      <Suspense fallback={<pre className="m-0 p-2 font-mono text-sm">{code}</pre>}>
        <SyntaxHighlighter
          language={language}
          style={docco(resolvedTheme === "dark")}
          wrapLines={false}
          className="font-mono box-border m-0 p-2 bg-gray-50 dark:bg-gray-900"
          customStyle={{ tabSize: 4 }}
          codeTagProps={{ className: "font-mono text-sm break-normal box-border" }}
        >
          {code}
        </SyntaxHighlighter>
      </Suspense>
    </div>
  )
}
