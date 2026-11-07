import type { ReviewFormValues } from "@/types/review"

/** Same values as a course's, minus `SECRET`: a review has no page of its own to reach by link. */
export const REVIEW_VISIBILITY_OPTIONS = [
  { value: "PUBLIC", label: "Public" },
  { value: "PRIVATE", label: "Private" },
]

export const REVIEW_VISIBILITY_LABELS = Object.fromEntries(
  REVIEW_VISIBILITY_OPTIONS.map((option) => [option.value, option.label]),
)

export const REVIEW_VISIBILITY_VALUES = REVIEW_VISIBILITY_OPTIONS.map((option) => option.value)

/** Unlike a new course, a review is ready to show as soon as it's written. */
export const DEFAULT_REVIEW_VISIBILITY = "PUBLIC"

export const REVIEW_NAME_MAX_LENGTH = 120
export const REVIEW_HEADLINE_MAX_LENGTH = 200
export const REVIEW_BODY_MAX_LENGTH = 2000
export const REVIEW_URL_MAX_LENGTH = 2000

/** Keeps one import to a single reasonably sized INSERT. */
export const REVIEW_IMPORT_MAX_ROWS = 500

/** The import's header row, matched case-insensitively; only `name` and `body` are required. */
export const REVIEW_CSV_COLUMNS = [
  "name",
  "headline",
  "body",
  "avatar_url",
  "source_url",
  "visibility",
] as const

export const EMPTY_REVIEW_FORM_VALUES: ReviewFormValues = {
  name: "",
  headline: "",
  body: "",
  avatarUrl: "",
  sourceUrl: "",
  visibility: DEFAULT_REVIEW_VISIBILITY,
}

/** Shown at avatar size, so a photo needs nothing like this; the cap just catches the wrong file. */
export const REVIEW_AVATAR_MAX_BYTES = 1024 * 1024

export const REVIEW_AVATAR_TYPES = ["png", "jpg", "webp"] as const

/** The file picker's `accept`, so other files are greyed out before they can be chosen. */
export const REVIEW_AVATAR_ACCEPT = "image/png,image/jpeg,image/webp"

/** Also what the `/assets/reviews/$` route accepts, so it can't be pointed at anything else in the bucket. */
export const REVIEW_AVATAR_KEY_PATTERN = /^reviews\/[0-9a-f]{12}\.(png|jpg|webp)$/
