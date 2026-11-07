import { useEffect, useRef, useState } from "react"
import { useTheme } from "tanstack-router-theme-provider"

import { useIsClient, useSiteConfig } from "@/lib/hooks"

// The CDN's `plotly-latest` alias stopped at 1.58.5, so newer releases have to be pinned.
const PLOTLY_SCRIPT_URL = "https://cdn.plot.ly/plotly-4.1.2.min.js"
const DEFAULT_PLOTLY_HEIGHT = 525

/**
 * Output HTML whose scripts must run, like a Plotly chart. The preview host evaluates what we
 * post and reports its height; `allow-scripts` alone keeps it from reaching anything of ours.
 */
export function HtmlIframe({ html }: { html: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const mounted = useIsClient()
  const [height, setHeight] = useState(0)
  const { resolvedTheme } = useTheme()
  const { notebookPreviewUrl } = useSiteConfig().deployment

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return
      const resizeHeight = (event.data as { resizeHeight?: unknown } | null)?.resizeHeight
      // The host reports `body.clientHeight`, which leaves out the body's default margins.
      if (typeof resizeHeight === "number" && resizeHeight > 0) setHeight(resizeHeight + 16)
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [])

  useEffect(() => {
    postToHost(iframeRef.current, { theme: resolvedTheme })
  }, [resolvedTheme])

  if (!mounted) return null

  return (
    <iframe
      ref={iframeRef}
      src={notebookPreviewUrl}
      title="Notebook output"
      className="w-full border-0"
      style={{ height }}
      sandbox="allow-scripts"
      onLoad={() =>
        postToHost(iframeRef.current, {
          iframeEvaluation: toEvaluation(html),
          theme: resolvedTheme,
        })
      }
    />
  )
}

/** A Plotly figure's JSON as the HTML Plotly itself would have written for it. */
export function plotlyFigureToHtml(figure: unknown) {
  const { data = [], layout = {} } = (figure ?? {}) as {
    data?: unknown
    layout?: { height?: number }
  }
  return `
    <div id="figure" style="width: 100%; height: ${layout.height ?? DEFAULT_PLOTLY_HEIGHT}px"></div>
    <script src="${PLOTLY_SCRIPT_URL}"></script>
    <script>
      Plotly.newPlot("figure", ${toScriptJson(data)}, ${toScriptJson(layout)}, {
        responsive: true,
        displaylogo: false,
      })
    </script>`
}

/** True for HTML that is nothing but script and style, such as Plotly's notebook loader. */
export function isScriptOnlyHtml(html: string) {
  return !html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, "").trim()
}

// The sandbox gives the frame an opaque origin, which no target other than "*" matches.
function postToHost(iframe: HTMLIFrameElement | null, message: object) {
  iframe?.contentWindow?.postMessage(message, "*")
}

/**
 * Script inserted through `innerHTML` never runs, so each one is swapped for a fresh element, in
 * order, waiting for a `src` to load before the inline code that calls into it.
 */
function toEvaluation(html: string) {
  return `(async () => {
    const parent = window.currentMessage.source
    const report = () => parent.postMessage({ resizeHeight: document.body.clientHeight }, "*")
    const container = document.createElement("div")
    container.className = "rendered_html"
    container.innerHTML = ${toScriptJson(html)}
    document.body.appendChild(container)
    new ResizeObserver(report).observe(document.body)
    for (const original of [...container.querySelectorAll("script")]) {
      const script = document.createElement("script")
      if (original.type) script.type = original.type
      if (original.src) {
        script.src = original.src
        await new Promise((resolve) => {
          script.onload = script.onerror = resolve
          original.replaceWith(script)
        })
      } else {
        script.textContent = original.textContent
        original.replaceWith(script)
      }
    }
  })()`
}

/** JSON that can sit inside a `<script>` without its own `</script>` ending the tag early. */
function toScriptJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c")
}
