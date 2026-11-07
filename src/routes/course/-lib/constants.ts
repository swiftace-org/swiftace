/**
 * `course_sections.visibility`, mirroring `CourseSectionStatus` in the legacy Flask app:
 * `DRAFT` is excluded from the section list, `HIDDEN` is listed but not openable, and `VISIBLE`
 * is both. Legacy `DEFAULT` gated on a `start_date` column this database lacks, so it can never
 * be open and behaves like `HIDDEN` — as does a NULL.
 */
export const COURSE_SECTION_VISIBILITY_DRAFT = "DRAFT"

export const COURSE_SECTION_VISIBILITY_VISIBLE = "VISIBLE"

/**
 * New sections start `HIDDEN`, so they are listed on the course page but not yet openable —
 * an admin can fill one in before learners can click into it. (`HIDDEN` does *not* hide the
 * section from the page; `DRAFT` is the one that does.)
 */
export const DEFAULT_COURSE_SECTION_VISIBILITY = "HIDDEN"

/** A section counts as completed once its progress row reaches this value. */
export const SECTION_COMPLETE_PROGRESS = 100

/**
 * The status an enrollee has on an assignment, mirroring `CourseAssignmentStatus` plus the
 * two states the legacy dashboard derived rather than stored: a submission with no status
 * counts as PENDING, or as DRAFT when `is_draft` is set.
 *
 * PROCESSING is legacy residue: it meant "an automated evaluator has this one", and nothing here
 * sets it — `course_sections.evaluation_type` and the worker behind it are not carried over. It
 * stays because 48 live submissions still hold it, and an admin needs to see those in the queue
 * rather than have them render as a blank status.
 */
export const ASSIGNMENT_STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "PASS", label: "Passed" },
  { value: "FAIL", label: "Failed" },
  { value: "DRAFT", label: "Draft" },
  { value: "PROCESSING", label: "Processing" },
]

export const ASSIGNMENT_STATUS_VALUES = ASSIGNMENT_STATUS_OPTIONS.map((option) => option.value)

export const ASSIGNMENT_STATUS_LABELS = Object.fromEntries(
  ASSIGNMENT_STATUS_OPTIONS.map((option) => [option.value, option.label]),
)

/** The statuses an admin can set by hand; DRAFT and PROCESSING are only ever derived. */
export const EVALUATION_DECISIONS = ["PASS", "FAIL", "PENDING"] as const

/**
 * Keys inside `course_assignment_submissions.assignment` that the submission form used for
 * its own bookkeeping — they are not answers, so the evaluation table hides them.
 */
export const SUBMISSION_INTERNAL_FIELDS = ["errors", "isDraft", "showAssignmentHonorDialog"]

/** `submission_requirements[].type` values whose answers are markdown rather than plain text. */
export const SUBMISSION_MARKDOWN_FIELD_TYPES = ["markdown", "textarea"]

/**
 * The only `submission_requirements[].validation` value that constrains an answer's shape.
 * Everything else in the legacy `Validations` enum is `STRING`, which accepts any text.
 */
export const SUBMISSION_VALIDATION_URL = "URL"

/**
 * Legacy: a value from the original Flask app's `Validations` enum, which nothing here writes. It
 * meant `URL` plus checks against notebooks that app hosted; this one hosts none, so assignments
 * that still declare it are read as `SUBMISSION_VALIDATION_URL`. The value matches stored rows.
 */
export const SUBMISSION_VALIDATION_LEGACY_HOSTED_URL = "JOVIAN_URL"

/**
 * Where `renderMarkdown({ embeds: true })` lets an `<iframe>` point. Matched as a prefix of the
 * parsed URL's origin and path, so a Google Doc or a lookalike host can't pass as a Slides deck.
 */
export const EMBED_URL_PREFIXES = [
  "https://docs.google.com/presentation/",
  "https://speakerdeck.com/player/",
]

/** It's the social image too, and link previews don't all take WebP or SVG. */
export const COURSE_IMAGE_TYPES = ["png", "jpg"] as const

export type CourseImageType = (typeof COURSE_IMAGE_TYPES)[number]

/** The file picker's `accept`, so other files are greyed out before they can be chosen. */
export const COURSE_IMAGE_ACCEPT = "image/png,image/jpeg"

/** It's the home page's largest image, so the cap is the same as the default cover's. */
export const COURSE_IMAGE_MAX_BYTES = 2 * 1024 * 1024

/** Also what the `/assets/course-images/$` route accepts, so it can't be pointed at anything else in the bucket. */
export const COURSE_IMAGE_KEY_PATTERN = /^course-images\/[0-9a-f]{12}\.(png|jpg)$/

const HOUR_MS = 60 * 60 * 1000

/** How long each AI tutor quota window lasts once a message opens it. */
export const AI_TUTOR_WINDOW_DURATIONS_MS = {
  session: 5 * HOUR_MS,
  weekly: 7 * 24 * HOUR_MS,
} as const

/** The learner's panel only shows their usage from here on, so it doesn't nag light users. */
export const AI_TUTOR_USAGE_NOTICE_PERCENT = 50

/** About two pages of text; anything longer is better sent as a file. */
export const AI_TUTOR_MESSAGE_MAX_LENGTH = 8000

/** How much of a conversation goes back to the model with each message: the most recent turns. */
export const AI_TUTOR_HISTORY_MAX_MESSAGES = 40

/** Model calls per reply, each tool round trip being one. The last is made to answer in text. */
export const AI_TUTOR_MAX_MODEL_CALLS = 8

/** Reasoning tokens count against this too, so it's well above the length of any useful answer. */
export const AI_TUTOR_MAX_OUTPUT_TOKENS = 16_000

/** About 15k tokens: a long notebook is cut here, both in a tool's result and in the prompt. */
export const AI_TUTOR_SECTION_CONTENT_MAX_CHARS = 60_000

/** Per code cell output, which is mostly long tables and logs the model gains little from. */
export const AI_TUTOR_CELL_OUTPUT_MAX_CHARS = 1500

export const AI_TUTOR_SEARCH_RESULTS_LIMIT = 8

export const AI_TUTOR_CONVERSATIONS_LIMIT = 50

export const AI_TUTOR_TITLE_MAX_LENGTH = 80

/** OpenAI bills roughly this many characters of English and code per token. */
export const CHARS_PER_TOKEN_ESTIMATE = 4

/** Pixels. Wide enough for code in a reply to read without wrapping much, beside a lesson. */
export const AI_TUTOR_PANEL_DEFAULT_WIDTH = 416

/** Dragging the panel's edge stops here, and short of 60% of the window, so the lesson stays readable. */
export const AI_TUTOR_PANEL_MIN_WIDTH = 320
export const AI_TUTOR_PANEL_MAX_WIDTH = 760
export const AI_TUTOR_PANEL_MAX_WINDOW_SHARE = 0.6

/** Cookies rather than `localStorage`, so the server renders the panel as the learner left it. */
export const AI_TUTOR_PANEL_OPEN_COOKIE = "ai_tutor_panel_open"
export const AI_TUTOR_PANEL_WIDTH_COOKIE = "ai_tutor_panel_width"
export const AI_TUTOR_PANEL_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60
