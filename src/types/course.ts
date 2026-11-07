export type CourseDisplay = {
  title: string
  id: number
  slug: string
  shortDescription: string | null
  cover: string | null
  isPaid: boolean | null
  visibility: string | null
}

export type AdminCourseSummary = {
  id: number
  slug: string
  title: string
  visibility: string | null
}

export type AdminCourseDetails = {
  id: number
  slug: string
  title: string
  shortDescription: string | null
  description: string | null
  cover: string | null
  visibility: string | null
  videoUrl: string | null
  certificateTemplate: string | null
  isPaid: boolean | null
  stripeProductId: string | null
  additionalInformation: string | null
}

/**
 * What the course details form holds and submits. Every text field is a string so the
 * inputs stay controlled; the server function trims them and converts blanks to null
 * before they become `CourseDetailsFields`.
 */
export type CourseDetailsFormValues = {
  title: string
  slug: string
  shortDescription: string
  description: string
  cover: string
  visibility: string
  videoUrl: string
  certificateTemplate: string
  isPaid: boolean
  stripeProductId: string
  additionalInformation: string
}

/** The editable subset of `courses`, as written to the database. */
export type CourseDetailsFields = {
  title: string
  slug: string
  shortDescription: string
  description: string | null
  cover: string | null
  visibility: string | null
  videoUrl: string | null
  certificateTemplate: string | null
  isPaid: boolean
  stripeProductId: string | null
  additionalInformation: string | null
}

export type CourseSectionType = "LESSON" | "ASSIGNMENT"

export type AdminCourseSectionSummary = {
  id: number
  slug: string
  title: string
  sectionType: string | null
  visibility: string | null
  /** Listed so an admin can see which sections a paid course leaves open to visitors. */
  alwaysOpen: boolean | null
}

export type CourseSectionDisplay = {
  id: number
  slug: string
  shortSlug: string | null
  title: string
  titlePrefix: string | null
  sectionType: string | null
  videoUrl: string | null
  shortDescription: string | null
  description: string | null
  resources: string | null
  additionalInformation: string | null
  quizUrl: string | null
  visibility: string | null
  /** The "Enable Section Preview" checkbox — see `isSectionLocked`. */
  alwaysOpen: boolean | null
  /** An optional section is listed but left out of the course's progress percentage. */
  isOptional: boolean | null
  /** When set, a lesson completes by answering its quiz rather than by a button. */
  requireQuestions: boolean | null
}

export type CourseOutlineRow = {
  id: number
  slug: string
  title: string
  shortDescription: string | null
  isPaid: boolean | null
  sections: unknown
  lastModified: Date
}

export type CourseSectionOutlineRow = {
  courseId: number
  slug: string
  title: string
  sectionType: string | null
  visibility: string | null
  alwaysOpen: boolean | null
  lastModified: Date
}

/** A listed course and the sections a signed-out visitor can open, as the sitemap and llms.txt list them. */
export type PublicCourseOutline = {
  title: string
  description: string | null
  path: string
  /** The newest edit to the course or any of its listed sections. */
  lastModified: Date
  sections: { title: string; path: string; lastModified: Date }[]
}

/** What the course pages' `head()` reads from the course layout's loader data. */
export type CourseHeadData = {
  course: {
    slug: string
    title: string
    shortDescription: string | null
    descriptionHtml: string | null
    cover: string | null
    isPaid: boolean | null
    visibility: string | null
  }
  sections: Pick<
    CourseSectionWithDescription,
    | "slug"
    | "title"
    | "sectionType"
    | "shortDescription"
    | "description"
    | "quizUrl"
    | "alwaysOpen"
    | "isOpen"
    | "isLocked"
  >[]
}

/** A course section as rendered on the course page, with its markdown pre-rendered. */
export type CourseSectionWithDescription = CourseSectionDisplay & {
  shortDescriptionHtml: string | null
  descriptionHtml: string | null
  /** Set when `resources` is a URL — should be fetched and rendered as a notebook. */
  resourcesUrl: string | null
  /** Set when `resources` is plain text — pre-rendered markdown HTML. */
  resourcesHtml: string | null
  additionalInformationHtml: string | null
  /**
   * Whether this section's content may be opened — see `isSectionOpen`. Resolved on the
   * server so the UI can render a listed-but-not-linked section without having to know the
   * visibility rules, and so the rules can't drift between the two.
   */
  isOpen: boolean
  /** Behind the paywall for this viewer — see `isSectionLocked`. */
  isLocked: boolean
  /** Open to this viewer only because it's marked as a preview, so it's worth badging. */
  isPreview: boolean
  /** Whether this viewer's progress row for the section reads as finished. */
  isCompleted: boolean
}
