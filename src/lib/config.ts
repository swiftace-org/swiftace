/** Search snippets cut off around here, so longer descriptions are truncated to fit. */
export const META_DESCRIPTION_MAX_LENGTH = 155

/** What a site shows until its own images are uploaded in `/manage/config`. */
export const DEFAULT_ICON_PATH = "/defaults/icon.png"
export const DEFAULT_COURSE_COVER_PATH = "/defaults/course-cover.svg"

/** Pages crawlers may follow links from but shouldn't list: gated, personal or admin-only. */
export const ROBOTS_NOINDEX_META = { name: "robots", content: "noindex, follow" }

/** The Stripe subscription statuses that grant access. */
export const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "trialing"]

/**
 * Statuses a subscription sits in before it has ever granted access — the first payment is
 * awaiting SCA, or was declined. `syncStripeSubscription` records these but must not revoke.
 */
export const PENDING_SUBSCRIPTION_STATUSES = ["incomplete", "incomplete_expired"]

/**
 * `course_enrollments.payment_status` doubles as an enrollment's provenance, and so decides
 * whether a lapse may take it away. NULL — every row the legacy app wrote — means an admin
 * grant or an outright purchase, and is never revoked. The legacy app never reads the column.
 */
export const ENROLLMENT_GRANTED_BY_SUBSCRIPTION = "SUBSCRIPTION_GRANTED"

/**
 * Was `ENROLLMENT_GRANTED_BY_SUBSCRIPTION` until a lapse revoked it, and the only marker a
 * resubscribe restores — so the enrollments an admin removed by hand stay removed.
 */
export const ENROLLMENT_REVOKED_BY_LAPSE = "SUBSCRIPTION_LAPSED"

export const AUTH_COOKIE_NAME = "AUTH_TOKEN"

/** These mirror the `varchar` lengths declared on `accounts` in `src/lib/schema.server.ts`. */
export const ACCOUNT_NAME_MAX_LENGTH = 64
export const ACCOUNT_EMAIL_MAX_LENGTH = 128
export const ACCOUNT_USERNAME_MAX_LENGTH = 64

/** Mirrors the `varchar` lengths on `courses` and `course_sections`. */
export const COURSE_TITLE_MAX_LENGTH = 100
export const COURSE_SECTION_TITLE_MAX_LENGTH = 100

/** `courses.visibility` values, mirroring `CourseVisibility` in the legacy Flask app. */
export const COURSE_VISIBILITY_OPTIONS = [
  { value: "PRIVATE", label: "Private" },
  { value: "PUBLIC", label: "Public" },
  { value: "SECRET", label: "Secret" },
]

export const COURSE_VISIBILITY_LABELS = Object.fromEntries(
  COURSE_VISIBILITY_OPTIONS.map((option) => [option.value, option.label]),
)

export const COURSE_VISIBILITY_VALUES = COURSE_VISIBILITY_OPTIONS.map((option) => option.value)

export const DEFAULT_COURSE_VISIBILITY = "PRIVATE"

/** How long a table's search box leads its URL param by, so typing isn't a round trip a key. */
export const TABLE_SEARCH_DEBOUNCE_MS = 300

export const TURNSTILE_RESPONSE_FIELD_NAME = "cf-turnstile-response"

/**
 * The AI tutor's instructions until an admin edits them on `/manage/ai-tutor`, which can also put
 * this back. The course outline, the learner's progress and the page they're on follow it.
 */
export const DEFAULT_AI_TUTOR_SYSTEM_PROMPT = `You are {{TUTOR_NAME}}, the AI tutor for {{SITE_NAME}}. You're helping {{LEARNER_NAME}} with the course "{{COURSE_TITLE}}".

How to teach:
- Be warm, encouraging and concise. Prefer short paragraphs, bullet points and small code examples over long essays.
- Ground your answers in the course. When a question relates to a lesson, look it up with your tools, and link to it with a relative Markdown link such as [Lesson 2](/course/example-course/lesson/example-lesson).
- Check understanding and build intuition: explain the "why", use analogies, and suggest a small exercise when it helps.
- If a question is outside the course, you may still help briefly, then relate it back to what the learner is studying.
- Never make up course content, deadlines, grades or policies. If you don't know, say so and suggest where to look.

Assignments and quizzes:
- Help learners understand the concepts, debug their own code and plan their approach, but don't write complete solutions to graded assignments or give away quiz answers. Guide them with hints and questions instead, one step at a time.
- When a learner shares an error, explain what it means and how to find the cause before suggesting a fix.

Formatting:
- Use Markdown. Put code in fenced blocks with a language, e.g. \`\`\`python.
- Write math with $...$ for inline and $$...$$ for display equations.`
