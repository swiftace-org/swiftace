import { createIsomorphicFn } from "@tanstack/react-start"
import { getCookie } from "@tanstack/react-start/server"

import {
  toAbsoluteUrl,
  toBreadcrumbJsonLd,
  toMetaDescription,
  toOrganizationJsonLd,
  toPageHead,
} from "@/lib/utils"
import type { SubmissionRequirement } from "@/types/assignment"
import type { CourseHeadData } from "@/types/course"
import type { JsonLd } from "@/types/seo"
import type { PublicSiteConfig } from "@/types/site-config"

import {
  AI_TUTOR_PANEL_COOKIE_MAX_AGE_SECONDS,
  AI_TUTOR_PANEL_DEFAULT_WIDTH,
  AI_TUTOR_PANEL_MAX_WIDTH,
  AI_TUTOR_PANEL_MIN_WIDTH,
  AI_TUTOR_PANEL_OPEN_COOKIE,
  AI_TUTOR_PANEL_WIDTH_COOKIE,
  COURSE_IMAGE_KEY_PATTERN,
  COURSE_SECTION_VISIBILITY_DRAFT,
  COURSE_SECTION_VISIBILITY_VISIBLE,
  SUBMISSION_INTERNAL_FIELDS,
  SUBMISSION_MARKDOWN_FIELD_TYPES,
  SUBMISSION_VALIDATION_LEGACY_HOSTED_URL,
  SUBMISSION_VALIDATION_URL,
} from "./constants"

/**
 * Whether a section appears in the course's section list at all. Mirrors `isSectionDisplayed`
 * in the legacy frontend: everything except `DRAFT`, and only real lesson/assignment rows —
 * `course_sections` also holds other kinds of rows.
 */
export function isSectionDisplayed(section: {
  visibility: string | null
  sectionType: string | null
}): boolean {
  return (
    section.visibility !== COURSE_SECTION_VISIBILITY_DRAFT &&
    (section.sectionType === "LESSON" || section.sectionType === "ASSIGNMENT")
  )
}

/**
 * Whether a section's content may be served — `VISIBLE` only, since the legacy `DEFAULT` +
 * `start_date` branch can't apply to this database. This has to hold server-side, not just in the
 * UI: it gates the notebook, the quiz and quiz grading against a guessed section slug.
 */
export function isSectionOpen(section: { visibility: string | null }): boolean {
  return section.visibility === COURSE_SECTION_VISIBILITY_VISIBLE
}

/**
 * Where an uploaded course image is served: `course-images/3fa9c2e1b07d.png` at
 * `/assets/course-images/3fa9c2e1b07d.png`. The key has no slug in it to go stale.
 */
export function toCourseImagePath(key: string): string {
  return `/assets/${key}`
}

export function isCourseImagePath(path: string): boolean {
  const prefix = "/assets/"
  return path.startsWith(prefix) && COURSE_IMAGE_KEY_PATTERN.test(path.slice(prefix.length))
}

/** A cover is a path on this site or a URL elsewhere, and crawlers only follow absolute ones. */
export function toCourseSocialImage(cover: string | null): string | null {
  if (!cover) return null
  return cover.startsWith("/") ? toAbsoluteUrl(cover) : cover
}

/** What the two gates below need to know about the caller — a `CourseForViewer`, structurally. */
export type SectionViewer = {
  course: { isPaid: boolean }
  isAdmin: boolean
  isEnrolled: boolean
}

/**
 * The paywall, mirroring the legacy `fetch_course_section` redirect: a paid course's sections are
 * closed to anyone not enrolled, except the ones an admin marked `always_open` — the "Enable
 * Section Preview" checkbox. Free courses gate nothing, which is the legacy behaviour too.
 *
 * Separate from `isSectionOpen` because they answer different questions: that one is whether the
 * section is published at all, this one whether *this* viewer has bought their way past it.
 */
export function isSectionLocked(section: { alwaysOpen: boolean }, viewer: SectionViewer): boolean {
  if (viewer.isAdmin || viewer.isEnrolled || !viewer.course.isPaid) return false
  return !section.alwaysOpen
}

/** Both gates at once, for the server functions that only care whether to serve the content. */
export function canOpenSection(
  section: { visibility: string | null; alwaysOpen: boolean },
  viewer: SectionViewer,
): boolean {
  if (!viewer.isAdmin && !isSectionOpen(section)) return false
  return !isSectionLocked(section, viewer)
}

/**
 * Splits a submission's `assignment` JSON into displayable fields, titled and ordered by the
 * assignment's `submission_requirements`. Answers to requirements that were later removed
 * still show up, under their raw key, so nothing an enrollee submitted goes missing.
 */
export function toSubmissionFields(
  assignment: unknown,
  requirements: SubmissionRequirement[],
): { id: string; title: string; value: string; isMarkdown: boolean }[] {
  if (!assignment || typeof assignment !== "object") return []

  const answers = assignment as Record<string, unknown>
  const requirementIds = new Set(requirements.map((requirement) => requirement.id))
  const extraIds = Object.keys(answers).filter(
    (key) => !requirementIds.has(key) && !SUBMISSION_INTERNAL_FIELDS.includes(key),
  )

  return [...requirements, ...extraIds.map((id) => ({ id, title: id, type: "input" }))]
    .map((requirement) => ({
      id: requirement.id,
      title: requirement.title || requirement.id,
      value: toDisplayableAnswer(answers[requirement.id]),
      isMarkdown: SUBMISSION_MARKDOWN_FIELD_TYPES.includes(requirement.type),
    }))
    .filter((field) => field.value.length > 0)
}

/** `course_sections.submission_requirements` is untyped JSON, so anything malformed is dropped. */
export function toSubmissionRequirements(value: unknown): SubmissionRequirement[] {
  if (!Array.isArray(value)) return []

  return value
    .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === "object")
    .filter((entry) => typeof entry.id === "string" && entry.id.length > 0)
    .map((entry) => ({
      id: entry.id as string,
      title: typeof entry.title === "string" ? entry.title.trim() : "",
      type: typeof entry.type === "string" ? entry.type : "input",
      required: entry.required === true,
      placeholder: typeof entry.placeholder === "string" ? entry.placeholder : "",
      validation: toSubmissionValidation(entry.validation),
    }))
}

/**
 * Legacy hosted-notebook URL fields are folded into plain `URL` here, at the one boundary every
 * reader goes through, so nothing downstream has to know the value ever existed. See
 * `SUBMISSION_VALIDATION_LEGACY_HOSTED_URL` for why it can't just be honoured.
 */
function toSubmissionValidation(value: unknown): string {
  if (typeof value !== "string") return ""
  return value === SUBMISSION_VALIDATION_LEGACY_HOSTED_URL ? SUBMISSION_VALIDATION_URL : value
}

/** Answers are usually strings, but a few legacy rows hold numbers or booleans. */
function toDisplayableAnswer(value: unknown): string {
  if (typeof value === "string") return value.trim()
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  return ""
}

export function isValidUrl(value: string) {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

/** The section pages the course layout's `head()` speaks for, by route id. */
const SECTION_PAGE_KINDS: Record<string, "lesson" | "assignment"> = {
  "/course/$courseSlug/lesson/$sectionSlug": "lesson",
  "/course/$courseSlug/assignment/$sectionSlug": "assignment",
}

/**
 * The `head()` for the course page and every lesson and assignment under it. The layout emits it
 * because it holds the data; tabs that shouldn't be indexed add their own robots tag on top.
 */
export function toCoursePageHead(
  siteConfig: PublicSiteConfig,
  { course, sections }: CourseHeadData,
  matches: { routeId: string; params: unknown }[],
) {
  const coursePath = `/course/${course.slug}`
  const image = toCourseSocialImage(course.cover)
  // SECRET courses open to anyone with the link but are unlisted, so search mustn't list them.
  const isListed = course.visibility === "PUBLIC"
  const courseCrumbs = [
    { name: "Courses", path: "/" },
    { name: course.title, path: coursePath },
  ]

  const sectionMatch = matches.find((match) => match.routeId in SECTION_PAGE_KINDS)
  if (!sectionMatch) {
    return toPageHead(siteConfig, {
      title: course.title,
      description: course.shortDescription ?? course.descriptionHtml,
      path: coursePath,
      image,
      noindex: !isListed,
      jsonLd: isListed
        ? [toCourseJsonLd(siteConfig, { course, sections }), toBreadcrumbJsonLd(courseCrumbs)]
        : [],
    })
  }

  const kind = SECTION_PAGE_KINDS[sectionMatch.routeId]
  const { sectionSlug } = sectionMatch.params as { sectionSlug: string }
  const section = sections.find((s) => s.slug === sectionSlug)
  const path = `${coursePath}/${kind}/${sectionSlug}`
  if (!section) return toPageHead(siteConfig, { title: course.title, path, image, noindex: true })

  const title = `${section.title} — ${course.title}`
  const description = section.shortDescription ?? section.description
  // A locked or unpublished section renders a gate, not the lesson, so it isn't worth a listing.
  if (!isListed || !section.isOpen || section.isLocked) {
    return toPageHead(siteConfig, { title, description, path, image, noindex: true })
  }

  const learningResource: JsonLd = {
    "@type": "LearningResource",
    name: section.title,
    description: toMetaDescription(description) ?? section.title,
    url: toAbsoluteUrl(path),
    learningResourceType: kind === "lesson" ? "Lesson" : "Assignment",
    inLanguage: "en",
    isAccessibleForFree: !course.isPaid || !!section.alwaysOpen,
    isPartOf: {
      "@type": "Course",
      "@id": `${toAbsoluteUrl(coursePath)}#course`,
      name: course.title,
      url: toAbsoluteUrl(coursePath),
    },
    provider: toOrganizationJsonLd(siteConfig),
    ...(image ? { image } : {}),
    ...(kind === "lesson" && section.quizUrl
      ? {
          hasPart: {
            "@type": "Quiz",
            name: `${section.title}: Questions`,
            url: toAbsoluteUrl(`${path}/questions`),
          },
        }
      : {}),
  }

  return toPageHead(siteConfig, {
    title,
    description,
    path,
    image,
    type: "article",
    jsonLd: [
      learningResource,
      toBreadcrumbJsonLd([...courseCrumbs, { name: section.title, path }]),
    ],
  })
}

/**
 * schema.org `Course`. Google's course-info fields (workload, schedule) aren't stored anywhere, so
 * they're left out rather than guessed; `offers` only says free or by subscription.
 */
function toCourseJsonLd(
  siteConfig: PublicSiteConfig,
  { course, sections }: CourseHeadData,
): JsonLd {
  const url = toAbsoluteUrl(`/course/${course.slug}`)
  const image = toCourseSocialImage(course.cover)

  return {
    "@type": "Course",
    "@id": `${url}#course`,
    name: course.title,
    description:
      toMetaDescription(course.shortDescription ?? course.descriptionHtml) ?? course.title,
    url,
    inLanguage: "en",
    isAccessibleForFree: !course.isPaid,
    provider: toOrganizationJsonLd(siteConfig),
    ...(image ? { image } : {}),
    hasCourseInstance: { "@type": "CourseInstance", courseMode: "online" },
    // With billing off a paid course isn't on sale at all, so it makes no offer.
    ...(course.isPaid
      ? siteConfig.integrations.billing.enabled
        ? { offers: { "@type": "Offer", category: "Subscription", url: toAbsoluteUrl("/pricing") } }
        : {}
      : { offers: { "@type": "Offer", category: "Free", price: 0, priceCurrency: "USD", url } }),
    syllabusSections: sections.map((section) => ({
      "@type": "Syllabus",
      name: section.title,
      ...(section.shortDescription
        ? { description: toMetaDescription(section.shortDescription) ?? section.title }
        : {}),
    })),
  }
}

export type AiTutorPanelPreferences = { open: boolean; width: number }

/** Open by default, so every learner finds the tutor, until they close it. */
function toPanelPreferences(open: string | undefined, width: string | undefined) {
  const parsedWidth = Number(width)
  return {
    open: open !== "false",
    width:
      Number.isFinite(parsedWidth) && parsedWidth >= AI_TUTOR_PANEL_MIN_WIDTH
        ? Math.min(parsedWidth, AI_TUTOR_PANEL_MAX_WIDTH)
        : AI_TUTOR_PANEL_DEFAULT_WIDTH,
  }
}

/** Whether the tutor's panel was left open, and how wide, from the same cookies on either side. */
export const readAiTutorPanelPreferences = createIsomorphicFn()
  .server((): AiTutorPanelPreferences =>
    toPanelPreferences(
      getCookie(AI_TUTOR_PANEL_OPEN_COOKIE),
      getCookie(AI_TUTOR_PANEL_WIDTH_COOKIE),
    ),
  )
  .client((): AiTutorPanelPreferences => {
    const cookies = new URLSearchParams(document.cookie.replaceAll("; ", "&"))
    return toPanelPreferences(
      cookies.get(AI_TUTOR_PANEL_OPEN_COOKIE) ?? undefined,
      cookies.get(AI_TUTOR_PANEL_WIDTH_COOKIE) ?? undefined,
    )
  })

export function writeAiTutorPanelCookie(name: string, value: string | number) {
  document.cookie = `${name}=${value}; path=/; max-age=${AI_TUTOR_PANEL_COOKIE_MAX_AGE_SECONDS}; samesite=lax`
}
