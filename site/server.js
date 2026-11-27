// Pages keep the JSX they rendered on Cloudflare. Bun only does that with this folder's
// tsconfig (jsxFactory: jsx); the app's tsconfig would turn them into React elements.
import { plugin } from "bun"
import { readFileSync, statSync } from "node:fs"
import { extname, join, sep } from "node:path"

const root = import.meta.dirname
const publicDir = join(root, "public")
const port = portFrom(process.env.PORT)
const hostname = process.env.HOST || "127.0.0.1"

// .md.txt is imported as its text, which is how the pages read their markdown.
plugin({
  name: "markdown-text",
  setup(build) {
    build.onLoad({ filter: /\.txt$/ }, async (args) => {
      const text = await Bun.file(args.path).text()
      return { contents: `export default ${JSON.stringify(text)};`, loader: "js" }
    })
  },
})

const { onRequestGet: renderHome } = await import("./functions/index.jsx")
const { onRequestGet: renderPost } = await import("./functions/posts/[slug].jsx")
const redirects = loadRedirects(join(publicDir, "_redirects"))

const home = await renderHome()
if (!(await home.text()).startsWith("<html")) {
  throw new Error(
    "Pages were not compiled with site/tsconfig.json. Run `bun server.js` from site/, " +
      "or `bun --tsconfig-override=site/tsconfig.json site/server.js` from the repo.",
  )
}

const TYPES = {
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/vnd.microsoft.icon",
  ".txt": "text/plain; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
}

Bun.serve({
  hostname,
  port,
  async fetch(req) {
    const url = new URL(req.url)
    const path = url.pathname
    const method = req.method
    const redirect = redirects.get(path)
    if (redirect) return allow(method, () => redirectResponse(redirect))
    if (path === "/" || path === "") return allow(method, () => renderHome())
    const post = /^\/posts\/([^/]+)\/?$/.exec(path)
    if (post) return allow(method, () => renderPost({ params: { slug: post[1] } }))
    const file = staticFile(path)
    if (file) return allow(method, () => fileResponse(file))
    return new Response(null, { status: 404, headers: { "cache-control": "no-store" } })
  },
})

console.log(`swiftace.org at http://${hostname}:${port}`)

function allow(method, respond) {
  if (method !== "GET" && method !== "HEAD") {
    return new Response(null, { status: 405, headers: { allow: "GET, HEAD" } })
  }
  return Promise.resolve(respond()).then((response) =>
    method === "HEAD" ? head(response) : response,
  )
}

async function head(response) {
  const headers = new Headers(response.headers)
  if (!headers.has("content-length")) {
    headers.set("content-length", String((await response.arrayBuffer()).byteLength))
  }
  return new Response(null, { status: response.status, headers })
}

function redirectResponse({ to, status }) {
  const body = `Redirecting to ${to}`
  return new Response(body, {
    status,
    headers: {
      location: to,
      "content-type": "text/plain;charset=UTF-8",
      "x-content-type-options": "nosniff",
    },
  })
}

/** Exact rules from public/_redirects, the file Cloudflare Pages used. Splats are not supported. */
function loadRedirects(file) {
  const rules = new Map()
  const text = readFileSync(file, "utf8")
  for (const [number, line] of text.split("\n").entries()) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const [from, to, code = "302"] = trimmed.split(/\s+/)
    if (!from?.startsWith("/") || !to || !/^[1-9]\d\d$/.test(code)) {
      throw new Error(`${file}:${number + 1}: expected "/from https://to 302"`)
    }
    rules.set(from, { to, status: Number(code) })
  }
  return rules
}

function staticFile(path) {
  if (path.includes("\0")) return
  let decoded
  try {
    decoded = decodeURIComponent(path)
  } catch {
    return
  }
  // pathname is absolute. join() would discard publicDir if this stayed that way.
  const relative = decoded.replace(/^\/+/, "")
  if (!relative || relative.split("/").includes("..")) return
  const file = join(publicDir, relative)
  if (!file.startsWith(publicDir + sep)) return
  if (relative === "_redirects" || relative.endsWith("/_redirects")) return
  try {
    if (!statSync(file).isFile()) return
  } catch {
    return
  }
  return file
}

function fileResponse(file) {
  const type = TYPES[extname(file).toLowerCase()] ?? Bun.file(file).type
  return new Response(Bun.file(file), {
    headers: {
      "content-type": type,
      "cache-control": "public, max-age=14400, must-revalidate",
      "x-content-type-options": "nosniff",
    },
  })
}

function portFrom(value) {
  const port = value || "2001"
  if (!/^[1-9]\d{1,4}$/.test(port) || Number(port) > 65535) {
    throw new Error(`PORT must be a port from 1 to 65535, not ${value}`)
  }
  return Number(port)
}
