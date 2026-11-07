import { readFile } from "node:fs/promises"

import { describe, expect, it } from "vite-plus/test"

import { DEFAULT_PORT, missingVariables, readPort, REQUIRED_VARIABLES } from "./environment"
import { parseParentOrigins, previewHandler } from "./preview"

const ORIGINS = ["https://example.com", "http://localhost:3000"]
const PAGE = '<script>const allowed = ["https://example.com","http://localhost:3000"]</script>'
const LENGTH = String(new TextEncoder().encode(PAGE).byteLength)
const handle = previewHandler(
  "<script>const allowed = __ALLOWED_PARENT_ORIGINS__</script>",
  ORIGINS,
)

describe("previewHandler", () => {
  it("serves the page at every path, with the origins and the sandbox policy", async () => {
    for (const path of ["/", "/plotly.js", "/a/b?c"]) {
      const response = handle(new Request(`http://preview.test${path}`))
      expect(response.status).toBe(200)
      expect(Object.fromEntries(response.headers)).toEqual({
        "content-security-policy":
          "sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox; frame-ancestors https://example.com http://localhost:3000",
        "referrer-policy": "no-referrer",
        "x-content-type-options": "nosniff",
        "content-type": "text/html; charset=utf-8",
        "content-length": LENGTH,
        "cache-control": "no-cache",
      })
      expect(await response.text()).toBe(PAGE)
    }
  })

  it("answers HEAD without a body, and refuses other methods", async () => {
    const head = handle(new Request("http://preview.test/", { method: "HEAD" }))
    expect(head.headers.get("content-length")).toBe(LENGTH)
    expect(await head.text()).toBe("")
    const post = handle(new Request("http://preview.test/", { method: "POST" }))
    expect(post.status).toBe(405)
    expect(post.headers.get("allow")).toBe("GET, HEAD")
    expect(post.headers.get("content-security-policy")).toMatch(/^sandbox /)
  })

  it("never sets a cookie", () => {
    expect(handle(new Request("http://preview.test/")).headers.has("set-cookie")).toBe(false)
  })
})

describe("parseParentOrigins", () => {
  it("takes origins separated by spaces or commas", () => {
    expect(parseParentOrigins(" https://example.com,http://localhost:3000 ")).toEqual(ORIGINS)
  })

  it("refuses nothing, and anything that isn't exactly an origin", () => {
    expect(() => parseParentOrigins("")).toThrow(/PREVIEW_PORT=0/)
    for (const bad of ["example.com", "https://example.com/", "https://example.com/x", "*"]) {
      expect(() => parseParentOrigins(bad)).toThrow(/isn't an origin/)
    }
  })
})

describe("environment", () => {
  it("lists every variable config.server.ts requires", async () => {
    const source = await readFile(new URL("../lib/config.server.ts", import.meta.url), "utf8")
    const required = [...source.matchAll(/ensureServerEnv\("(\w+)"\)/g)].map((match) => match[1])
    expect([...REQUIRED_VARIABLES].sort()).toEqual(required.sort())
  })

  it("reports what's missing or blank", () => {
    const env = Object.fromEntries(REQUIRED_VARIABLES.map((name) => [name, "x"]))
    expect(missingVariables(env)).toEqual([])
    expect(missingVariables({ ...env, DATABASE_URL: " " })).toEqual(["DATABASE_URL"])
  })

  it("reads ports, allowing 0 only where asked", () => {
    expect(readPort({}, "PORT", DEFAULT_PORT)).toBe(4000)
    expect(readPort({ PORT: "8080" }, "PORT", DEFAULT_PORT)).toBe(8080)
    expect(readPort({ P: "0" }, "P", 4100, { allowZero: true })).toBe(0)
    for (const bad of ["0", "65536", "80a", "-1"]) {
      expect(() => readPort({ PORT: bad }, "PORT", DEFAULT_PORT)).toThrow(/PORT should be/)
    }
  })
})
