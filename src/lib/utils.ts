import { isNotFound, isRedirect } from "@tanstack/react-router"
import type { AnyRouteMatch, AnyRouter, SearchSchemaInput } from "@tanstack/react-router"
import { createIsomorphicFn, createMiddleware } from "@tanstack/react-start"
import { getRequest, setResponseStatus } from "@tanstack/react-start/server"
import { clsx } from "clsx"
import type { ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import { META_DESCRIPTION_MAX_LENGTH, ROBOTS_NOINDEX_META } from "@/lib/config"
import {
  captureServerException,
  getCurrentAccount,
  getSiteConfig,
  getSiteUrl,
} from "@/lib/utils.server"
import { fetchCurrentSession } from "@/routes/-functions/fetch-current-session"
import type { CurrentSession } from "@/types/account"
import type { SortOrder } from "@/types/common"
import type { NotebookCell, NotebookJson, NotebookOutput } from "@/types/notebook"
import type { JsonLd, PageSeo } from "@/types/seo"
import type { Integration, PublicSiteConfig } from "@/types/site-config"

// Combine class strings & resolve Tailwind conflicts
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/** Up to two initials for an avatar fallback, from a display name or username. */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

/** Canonical form used for storing and comparing email addresses. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Turns a rejected server function call into something worth showing the user. Expected problems
 * come back as `{ error }`, so a rejection is unexpected — usually the middleware refusing a
 * request after the session expired under an already-rendered page.
 */
export function toSubmitErrorMessage(error: unknown, fallback: string): string {
  console.error(fallback, error)
  return error instanceof Error && error.message ? error.message : fallback
}

/**
 * What a `validateSearch` normalizer accepts. `SearchSchemaInput` is what tells the router to use
 * this shape for `<Link search={...}>`, so links don't have to spell out every param.
 */
export type SearchParamsInput<T> = Partial<Record<keyof T, unknown>> & SearchSchemaInput

/** Minimal RFC 4180 CSV tokenizer supporting quoted fields and escaped quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ",") {
      row.push(field)
      field = ""
    } else if (char === "\n") {
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else if (char !== "\r") {
      field += char
    }
  }

  if (field.length || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

/** Sizes as people read them in a file picker — "2.4 MB", not a byte count. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" })

const RELATIVE_TIME_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60 * 1000],
  ["month", 30 * 24 * 60 * 60 * 1000],
  ["day", 24 * 60 * 60 * 1000],
  ["hour", 60 * 60 * 1000],
  ["minute", 60 * 1000],
]

/**
 * "3 days ago" for a queue that is judged by how long it has been waiting. The server and
 * the browser can land on either side of a boundary, so anything rendering this should
 * suppress the hydration warning and keep the exact timestamp in a tooltip.
 */
export function formatRelativeTime(value: Date | string): string {
  const difference = new Date(value).getTime() - Date.now()

  for (const [unit, milliseconds] of RELATIVE_TIME_UNITS) {
    if (Math.abs(difference) >= milliseconds) {
      return relativeTimeFormatter.format(Math.round(difference / milliseconds), unit)
    }
  }
  return "just now"
}

export function toSortOrder(value: unknown, fallback: SortOrder): SortOrder {
  if (value === "asc" || value === "desc") return value
  return fallback
}

export function toFiniteNumber(value: unknown): number | null {
  const parsed = typeof value === "string" ? Number(value) : value
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : null
}

/** A single-value search param arrives as a bare string rather than a one-item array. */
export function toStringArray(value: unknown): string[] {
  if (typeof value === "string") return value ? [value] : []
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string" && item.length > 0)
}

/**
 * `quizzes.json_data` holds the quiz's question ids in display order. It's untyped JSON,
 * so anything that isn't a number is dropped rather than trusted.
 */
export function toOrderedQuestionIds(jsonData: unknown): number[] {
  if (!Array.isArray(jsonData)) return []
  return jsonData.filter((id): id is number => typeof id === "number")
}

export function joinSource(source: string | string[] | undefined) {
  if (!source) return ""
  return typeof source === "string" ? source : source.join("")
}

export function isNotebookValid(data: NotebookJson) {
  const requiredKeys = ["nbformat", "nbformat_minor", "metadata"]
  if (data.nbformat === 4) {
    requiredKeys.push("cells")
  } else if (data.nbformat === 3) {
    requiredKeys.push("worksheets")
  }
  return requiredKeys.every((key) => key in data)
}

const mimeMap: Record<string, string> = {
  text: "text/plain",
  html: "text/html",
  svg: "image/svg+xml",
  png: "image/png",
  jpeg: "image/jpeg",
  latex: "text/latex",
  json: "application/json",
  javascript: "application/javascript",
}

function toMimeKey(data: Record<string, unknown> | undefined) {
  if (!data) return data
  return Object.entries(data).reduce<Record<string, unknown>>((result, [key, value]) => {
    result[mimeMap[key] ?? key] = value
    return result
  }, {})
}

function upgradeOutput(output: Record<string, unknown>): NotebookOutput {
  const outputType = output.output_type
  if (outputType === "pyout" || outputType === "display_data") {
    const {
      output_type: _outputType,
      execution_count,
      prompt_number,
      metadata,
      ...data
    } = output as Record<string, unknown>
    const upgraded: NotebookOutput = {
      output_type: outputType === "pyout" ? "execute_result" : "display_data",
      execution_count: (execution_count ?? prompt_number) as number | undefined,
      metadata: toMimeKey(metadata as Record<string, unknown>),
      data: toMimeKey(data),
    }
    if (upgraded.data && "application/json" in upgraded.data) {
      upgraded.data["application/json"] = JSON.parse(upgraded.data["application/json"] as string)
    }
    return upgraded
  }
  if (outputType === "pyerr") {
    return { ...output, output_type: "error" } as NotebookOutput
  }
  if (outputType === "stream") {
    return { ...output, name: (output.stream as string) ?? "stdout" } as NotebookOutput
  }
  return output as NotebookOutput
}

function upgradeCell(cell: Record<string, unknown>): NotebookCell {
  const upgraded = { ...cell }
  if (upgraded.cell_type === "code") {
    upgraded.source = upgraded.input ?? ""
    upgraded.execution_count = upgraded.prompt_number ?? 0
    upgraded.outputs = ((upgraded.outputs as Record<string, unknown>[]) ?? []).map(upgradeOutput)
  } else if (upgraded.cell_type === "heading") {
    upgraded.cell_type = "markdown"
    const level = (upgraded.level as number) ?? 1
    upgraded.source = `${"#".repeat(level)} ${joinSource(upgraded.source as string | string[])}`
  } else if (upgraded.cell_type === "html") {
    upgraded.cell_type = "markdown"
  }
  const {
    prompt_number: _promptNumber,
    input: _input,
    level: _level,
    collapsed: _collapsed,
    language: _language,
    ...rest
  } = upgraded
  return rest as NotebookCell
}

/** Upgrades a legacy nbformat v3 notebook to v4 shape. No-op if already v4. */
export function convertNotebook(data: NotebookJson): NotebookJson {
  if (data.nbformat === 4) return data

  const { nbformat, name: _name, signature: _signature, worksheets, ...rest } = data
  const cells = (worksheets ?? []).reduce<NotebookCell[]>(
    (total, current) => total.concat(current.cells.map((cell) => upgradeCell(cell))),
    [],
  )

  return {
    ...rest,
    nbformat: 4,
    metadata: { orig_nbformat: nbformat },
    cells,
  }
}

/**
 * The signed-in session, remembered for as long as the tab lives.
 *
 * Every navigation re-runs the root `beforeLoad`, and the router blanks each match's context
 * while it does — so awaiting a round trip there rendered the signed-out navbar until the
 * session came back. The browser answers from this cache and refetches behind the navigation
 * instead. Only the browser may cache: one server process serves every visitor.
 */
let cachedSession: CurrentSession | undefined
let revalidation: Promise<void> | undefined

const isBrowser = () => typeof document !== "undefined"

/** The root route's session lookup — synchronous, and free, once the tab has a copy. */
export function loadCurrentSession(): CurrentSession | Promise<CurrentSession> {
  if (!isBrowser()) return fetchCurrentSession()
  if (cachedSession) return cachedSession

  return fetchCurrentSession().then((session) => {
    cacheSession(session)
    return session
  })
}

/**
 * Seeds the cache from the root context, which the server sends down with the page — the first
 * load hydrates that context instead of running `beforeLoad`, so nothing else would fill it.
 *
 * Only ever the first copy: a navigation publishes its new location before its matches, so a
 * render mid-navigation still sees the previous page's context. Writing that back would undo a
 * login or logout `refreshSession` just cached, and the next page would render signed out.
 */
export function seedSessionCache(context: Partial<CurrentSession>) {
  if (cachedSession === undefined) cacheSession(context)
}

/** Returns whether this changed what the tab had. */
function cacheSession({ account, hasActiveSubscription, siteConfig }: Partial<CurrentSession>) {
  // A context mid-`beforeLoad` is blank, and caching that would sign the viewer out.
  if (!isBrowser() || account === undefined || siteConfig === undefined) return false

  const session = { account, hasActiveSubscription: hasActiveSubscription ?? false, siteConfig }
  const changed = JSON.stringify(session) !== JSON.stringify(cachedSession)
  cachedSession = session
  return changed
}

/** The tab's copy, for a render that lands mid-`beforeLoad` and finds the context blank. */
export function getCachedSiteConfig(): PublicSiteConfig | undefined {
  return cachedSession?.siteConfig
}

/**
 * Refetches behind the navigation that triggered it, and reloads the page's data only if the
 * session moved on under us — signed out in another tab, subscription lapsed, profile renamed.
 * That reload doesn't flash, since `beforeLoad` answers from the cache this just wrote.
 */
export async function revalidateSession(router: AnyRouter) {
  revalidation ??= fetchCurrentSession()
    .then((session) => {
      if (cacheSession(session)) void router.invalidate()
    })
    // A refetch that fails leaves the tab on the session it already has.
    .catch(() => {})
    .finally(() => {
      revalidation = undefined
    })

  await revalidation
}

/**
 * Reloads the page's data against a freshly fetched session, for the three things that change
 * one from this tab: logging in, logging out, and editing the profile. Everywhere else
 * `router.invalidate()` is enough.
 *
 * Pass `href` to leave the page first: invalidating it in place re-renders it under the new
 * session, which flashes its signed-out view or trips its `/login` guard on the way out.
 */
export async function refreshSession(router: AnyRouter, href?: string) {
  cacheSession(await fetchCurrentSession())
  if (href) await router.navigate({ href })
  await router.invalidate()
}

/**
 * Puts the signed-in account on `context.account` and rejects anonymous callers. Routes still
 * guard themselves in `beforeLoad`, since a server function can't redirect, so this is the
 * backstop for a direct call. It throws rather than returning an error.
 */
export const authMiddleware = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const account = await getCurrentAccount()
  if (!account) {
    setResponseStatus(401)
    throw new Error("You must be signed in to do that.")
  }
  return next({ context: { account } })
})

/** `authMiddleware` plus an admin check. Also provides `context.account`. */
export const adminMiddleware = createMiddleware({ type: "function" })
  .middleware([authMiddleware])
  .server(async ({ next, context }) => {
    if (!context.account.isAdmin) {
      setResponseStatus(403)
      throw new Error("You must be an admin to do that.")
    }
    return next()
  })

/**
 * Rejects calls while an integration is switched off in `/manage/config`. Its buttons are hidden
 * then, so a call is from a page rendered before the switch flipped — or not from the app at all.
 */
export function integrationMiddleware(integration: Integration) {
  return createMiddleware({ type: "function" }).server(async ({ next }) => {
    const { integrations } = await getSiteConfig()
    if (!integrations[integration].enabled) {
      setResponseStatus(404)
      throw new Error("This feature is turned off. Please reload the page.")
    }
    return next()
  })
}

/**
 * Redirects and 404s are how routes answer, not failures. Nor is a client hanging up mid-request:
 * Start then throws the signal's reason, Node's "aborted" error, which no fix on our side can stop.
 */
function isReportableError(error: unknown, request: Request): boolean {
  return !isRedirect(error) && !isNotFound(error) && !request.signal.aborted
}

/**
 * Reports what a server function throws before Start turns it into a 500 for the caller. It
 * runs ahead of every other middleware, so it also sees the throws from `authMiddleware`.
 */
export const errorTrackingMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next, serverFnMeta }) => {
    try {
      return await next()
    } catch (error) {
      if (isReportableError(error, getRequest())) {
        captureServerException(error, { server_fn: serverFnMeta.name, file: serverFnMeta.filename })
      }
      throw error
    }
  },
)

/** The same for server routes (the Stripe webhook, sitemap), which no function middleware wraps. */
export const errorTrackingRequestMiddleware = createMiddleware({ type: "request" }).server(
  async ({ next, request }) => {
    try {
      return await next()
    } catch (error) {
      if (isReportableError(error, request)) {
        captureServerException(error, { $current_url: request.url })
      }
      throw error
    }
  },
)

/** `getSiteUrl`, for `head()` — which also runs in the browser on every client-side navigation. */
export const getSiteOrigin = createIsomorphicFn()
  .server(() => getSiteUrl())
  .client(() => window.location.origin)

export function toAbsoluteUrl(path: string): string {
  return `${getSiteOrigin()}${path}`
}

/**
 * A public page's `head()`. The deepest route wins each meta tag but links aren't deduplicated,
 * so call this from one route per page — a layout's canonical would land on all its children.
 */
export function toPageHead(
  { general, branding }: PublicSiteConfig,
  { title, description, path, image, type = "website", noindex = false, jsonLd = [] }: PageSeo,
): {
  meta: NonNullable<AnyRouteMatch["meta"]>
  links: NonNullable<AnyRouteMatch["links"]>
  scripts: NonNullable<AnyRouteMatch["headScripts"]>
} {
  const url = toAbsoluteUrl(path)
  // The site description is written as a meta description, so it isn't cut to a snippet's length.
  const summary =
    description === general.description
      ? general.description
      : (toMetaDescription(description) ?? general.description)
  const ogImage = image || (branding.socialImageUrl && toAbsoluteUrl(branding.socialImageUrl))

  return {
    meta: [
      { title: `${title} — ${general.siteName}` },
      { name: "description", content: summary },
      ...(noindex ? [ROBOTS_NOINDEX_META] : []),
      { property: "og:title", content: title },
      { property: "og:description", content: summary },
      { property: "og:url", content: url },
      { property: "og:type", content: type },
      ...toSocialImageMeta(ogImage),
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: summary },
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: jsonLd.map(toJsonLdScript),
  }
}

/** Without an image a large card would be an empty box, so the plain card is used instead. */
export function toSocialImageMeta(image: string): NonNullable<AnyRouteMatch["meta"]> {
  if (!image) return [{ name: "twitter:card", content: "summary" }]
  return [
    { property: "og:image", content: image },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:image", content: image },
  ]
}

/** Escapes `<`, `>` and `&` so DB text in a JSON-LD string can't close the script tag early. */
export function toJsonLdScript(node: JsonLd) {
  const json = JSON.stringify({ "@context": "https://schema.org", ...node })
  return {
    type: "application/ld+json",
    children: json.replace(
      /[<>&\u2028\u2029]/g,
      (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`,
    ),
  }
}

/**
 * Markdown or HTML flattened to one line of plain text and cut to a search snippet's length.
 * List items and headings become sentences, since descriptions here are mostly bullet lists.
 */
export function toMetaDescription(text: string | null | undefined): string | null {
  if (!text) return null

  const plain = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<h[1-6][^>]*>/gi, "\n# ")
    .replace(/<\/(p|li|h[1-6]|div|tr)>|<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, " ")
    .split("\n")
    .map((line) => {
      const content = line.replace(/^\s*(#{1,6}|>|[-*+]|\d+[.)])\s+/, "").trim()
      const isBlock = content !== line.trim()
      return isBlock && content && !/[.!?:;,]$/.test(content) ? `${content}.` : content
    })
    .join(" ")
    // Underscores stay: they're more often `snake_case` code than emphasis here.
    .replace(/[*`~]+/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x?27;|&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()

  if (!plain) return null
  if (plain.length <= META_DESCRIPTION_MAX_LENGTH) return plain
  const cut = plain.slice(0, META_DESCRIPTION_MAX_LENGTH - 1)
  const lastSpace = cut.lastIndexOf(" ")
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[\s.,;:!?-]+$/, "")}…`
}

/** Inlined wherever it's needed rather than referenced by `@id`, so each block stands alone. */
export function toOrganizationJsonLd({ general, branding }: PublicSiteConfig): JsonLd {
  const origin = getSiteOrigin()
  return {
    "@type": "Organization",
    "@id": `${origin}/#organization`,
    name: general.siteName,
    url: origin,
    logo: `${origin}/icon-512.png?v=${branding.iconVersion}`,
  }
}

export function toBreadcrumbJsonLd(items: { name: string; path: string }[]): JsonLd {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: toAbsoluteUrl(item.path),
    })),
  }
}
