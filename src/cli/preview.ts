// The notebook preview server: a page on a domain of its own that runs notebook outputs' scripts,
// like Plotly charts, which the app embeds in a sandboxed iframe (`HtmlIframe`). It never gets a
// real origin, so those scripts can't read or set cookies; see "Notebook preview" in README.md.
import { CommandError } from "./shell.ts"

/** The parts of the page's response that don't depend on the request. */
export function previewHeaders(origins: string[]): Record<string, string> {
  return {
    // Forces an opaque origin even when a page frames us without a sandbox attribute, so notebook
    // scripts can never read or set cookies.
    "Content-Security-Policy": `sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox; frame-ancestors ${origins.join(" ")}`,
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  }
}

/**
 * Serves the page at every path. It checks each message against the same origins that may frame
 * it, which are filled in here so the two can't drift apart.
 */
export function previewHandler(page: string, origins: string[]): (request: Request) => Response {
  const headers = previewHeaders(origins)
  const body = new TextEncoder().encode(
    page.replace("__ALLOWED_PARENT_ORIGINS__", JSON.stringify(origins)),
  )
  return (request) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response(null, { status: 405, headers: { ...headers, Allow: "GET, HEAD" } })
    }
    return new Response(request.method === "HEAD" ? null : body, {
      headers: {
        ...headers,
        "Content-Type": "text/html; charset=utf-8",
        "Content-Length": String(body.byteLength),
        "Cache-Control": "no-cache",
      },
    })
  }
}

/** Space- or comma-separated; refuses a page nothing is allowed to embed. */
export function parseParentOrigins(value = ""): string[] {
  const origins = value.split(/[\s,]+/).filter(Boolean)
  if (!origins.length) {
    throw new CommandError(
      "Set PREVIEW_ALLOWED_PARENT_ORIGINS to the origins of the sites that embed the notebook " +
        "preview, e.g. https://example.com, or turn it off with PREVIEW_PORT=0.",
    )
  }
  for (const origin of origins) {
    if (URL.parse(origin)?.origin !== origin) {
      throw new CommandError(
        `PREVIEW_ALLOWED_PARENT_ORIGINS: "${origin}" isn't an origin like https://example.com.`,
      )
    }
  }
  return origins
}
