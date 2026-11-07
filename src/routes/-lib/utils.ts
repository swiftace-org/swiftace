import type { PostHog } from "posthog-js"

import { formatFileSize, getCachedSiteConfig } from "@/lib/utils"
import type { PublicIntegrationSettings } from "@/types/site-config"

import {
  SUPPORT_ATTACHMENT_EXTENSIONS,
  SUPPORT_ATTACHMENT_MAX_BYTES,
  SUPPORT_ATTACHMENT_MAX_COUNT,
} from "./constants"

/** Shared by the dialog and the server function, so a rejected file is caught before upload. */
export function toSupportAttachmentError(files: { name: string; size: number }[]): string | null {
  if (files.length > SUPPORT_ATTACHMENT_MAX_COUNT) {
    return `Attach at most ${SUPPORT_ATTACHMENT_MAX_COUNT} files.`
  }

  for (const file of files) {
    if (file.size > SUPPORT_ATTACHMENT_MAX_BYTES) {
      return `${file.name} is larger than ${formatFileSize(SUPPORT_ATTACHMENT_MAX_BYTES)}.`
    }
    const extension = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() : ""
    if (!SUPPORT_ATTACHMENT_EXTENSIONS.includes(extension ?? "")) {
      return `${file.name} isn't a supported file type. Attach images, PDFs, documents, notebooks, code or text files.`
    }
  }

  return null
}

/**
 * Microsoft's link scanner (Outlook Safe Links, a CefSharp headless browser) rejects promises
 * with this string from its own injected bridge, whenever it previews a link we emailed.
 */
const CRAWLER_REJECTION = /Object Not Found Matching Id:\d+, MethodName:\w+, ParamCount:\d+/

function isCrawlerNoise(eventName: string, properties: Record<string, unknown>): boolean {
  if (eventName !== "$exception") return false
  const exceptions = properties.$exception_list as { value?: unknown }[] | undefined
  return !!exceptions?.some((exception) => CRAWLER_REJECTION.test(String(exception.value)))
}

let posthogPromise: Promise<PostHog> | undefined

/**
 * Imported on first use so the SDK stays out of the entry chunk every page has to parse. A token
 * changed in `/manage/config` takes effect on the tab's next full load, not mid-session.
 */
export function loadPostHog({
  projectToken,
  host,
}: PublicIntegrationSettings["posthog"]): Promise<PostHog> {
  posthogPromise ??= import("posthog-js").then(({ default: posthog }) => {
    posthog.init(projectToken, {
      api_host: host,
      defaults: "2026-05-30",
      // Set here rather than left to the project setting, so turning that off can't silence it.
      capture_exceptions: true,
      before_send: (event) =>
        event && isCrawlerNoise(event.event, event.properties) ? null : event,
    })
    return posthog
  })
  return posthogPromise
}

/**
 * Sent along with a signup or login, so the server's `signed_up` and `logged_in` events link to
 * this tab's session recording. Blank when PostHog is off or failed to load.
 */
export async function getPostHogSessionId(): Promise<string | undefined> {
  if (!posthogPromise) return undefined
  return posthogPromise
    .then((client) => client.get_session_id() || undefined)
    .catch(() => undefined)
}

/**
 * For errors a route's error boundary catches: React hands those to the boundary instead of
 * `window.onerror`, so autocapture never sees them.
 */
export function captureClientException(error: unknown): void {
  const posthog = getCachedSiteConfig()?.integrations.posthog
  if (!posthog?.enabled || typeof document === "undefined") return
  void loadPostHog(posthog).then((client) => client.captureException(error))
}

const REVIEW_SOURCE_SITES = {
  "linkedin.com": { site: "linkedin", label: "LinkedIn" },
  "producthunt.com": { site: "producthunt", label: "Product Hunt" },
} as const

/** Which site a review's link points at, so the card can show that site's logo. */
export function toReviewSource(sourceUrl: string): {
  site: "linkedin" | "producthunt" | null
  label: string
} {
  let host: string
  try {
    host = new URL(sourceUrl).hostname
  } catch {
    return { site: null, label: "the source" }
  }
  // Matches regional subdomains too, like `in.linkedin.com`.
  const domain = (Object.keys(REVIEW_SOURCE_SITES) as (keyof typeof REVIEW_SOURCE_SITES)[]).find(
    (key) => host === key || host.endsWith(`.${key}`),
  )
  return domain ? REVIEW_SOURCE_SITES[domain] : { site: null, label: host.replace(/^www\./, "") }
}
