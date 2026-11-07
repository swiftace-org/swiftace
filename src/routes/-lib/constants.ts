import type { Integration } from "@/types/site-config"

/** Long enough that crawlers can't make these a load on the database, short enough to pick up edits. */
export const CRAWLER_FILE_TTL_MS = 60 * 60 * 1000

/** Caddy serves the app with no CDN in front, so the in-process memo is what actually saves work. */
export const CRAWLER_FILE_CACHE_CONTROL =
  "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400"

/** The public pages that aren't courses, for the sitemap and llms.txt — each only while it's on. */
export const PUBLIC_STATIC_PAGES: { title: string; path: string; integration?: Integration }[] = [
  { title: "Pricing", path: "/pricing", integration: "billing" },
  { title: "Privacy Policy", path: "/privacy-policy.html" },
  { title: "Terms of Service", path: "/terms-of-service.html" },
]

export const SUPPORT_SUBJECT_MAX_LENGTH = 200
export const SUPPORT_MESSAGE_MAX_LENGTH = 10_000

/**
 * Attachments ride inside the email, and base64 grows them by a third — 3 × 5 MB lands near
 * 20 MB, under both SES's 40 MB message cap and the 25 MB Gmail accepts.
 */
export const SUPPORT_ATTACHMENT_MAX_COUNT = 3
export const SUPPORT_ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024

/** What a learner plausibly sends: screenshots, documents, notebooks, code and data. */
export const SUPPORT_ATTACHMENT_EXTENSIONS = (
  "png jpg jpeg gif webp heic pdf doc docx xls xlsx ppt pptx txt md log csv tsv json " +
  "ipynb py sql r html css"
).split(" ")

/** The file picker's `accept`, so disallowed files are greyed out before they can be chosen. */
export const SUPPORT_ATTACHMENT_ACCEPT = SUPPORT_ATTACHMENT_EXTENSIONS.map(
  (extension) => `.${extension}`,
).join(",")
