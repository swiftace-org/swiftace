import SupportRequestEmail from "@/emails/support-request-email"
import { toMetaDescription } from "@/lib/utils"
import { getSiteConfig, readEmailBrand, sendSesEmail } from "@/lib/utils.server"
import type { Account } from "@/types/account"
import type { EmailAttachment } from "@/types/common"
import type { CourseOutlineRow, CourseSectionOutlineRow, PublicCourseOutline } from "@/types/course"

import { readCourseSectionOutlines, readListedCourseOutlines } from "../course/-lib/db.server"
import { isSectionDisplayed, isSectionLocked, isSectionOpen } from "../course/-lib/utils"
import { CRAWLER_FILE_TTL_MS, PUBLIC_STATIC_PAGES } from "./constants"

/**
 * Every listed course with the sections a signed-out visitor can open — the same gates the pages
 * apply, so a locked or hidden lesson's gate page is never offered to a crawler.
 */
export async function readPublicCourseOutlines(): Promise<PublicCourseOutline[]> {
  const courses = await readListedCourseOutlines()
  const sections = await readCourseSectionOutlines(courses.map((course) => course.id))
  return courses.map((course) => toPublicCourseOutline(course, sections))
}

const crawlerFileCache = new Map<string, { body: Promise<string>; expiresAt: number }>()

/**
 * Builds a crawler file at most once per `CRAWLER_FILE_TTL_MS`, sharing one in-flight build
 * between concurrent requests. Keyed by origin too, since the URLs inside are absolute.
 */
export function readCachedCrawlerFile(key: string, build: () => Promise<string>): Promise<string> {
  const cached = crawlerFileCache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.body

  const body = build()
  crawlerFileCache.set(key, { body, expiresAt: Date.now() + CRAWLER_FILE_TTL_MS })
  body.catch(() => crawlerFileCache.delete(key))
  return body
}

export async function readPublicStaticPages(): Promise<{ title: string; path: string }[]> {
  const { integrations } = await getSiteConfig()
  return PUBLIC_STATIC_PAGES.filter(
    (page) => !page.integration || integrations[page.integration].enabled,
  )
}

/** The learner's own copy of a support request, with the support inbox in cc as the record. */
export async function sendSupportRequestEmail({
  account,
  subject,
  message,
  attachments,
}: {
  account: Account
  subject: string
  message: string
  attachments: EmailAttachment[]
}): Promise<{ success: true } | { success: false; error: unknown }> {
  const { general } = await getSiteConfig()
  return sendSesEmail({
    to: account.email,
    cc: [general.supportEmail],
    subject: `[${general.siteName} Support] ${subject}`,
    attachments,
    reactBody: SupportRequestEmail({
      brand: await readEmailBrand(),
      recipientName: account.name || account.username,
      email: account.email,
      subject,
      message,
      attachments: attachments.map((attachment) => ({
        filename: attachment.filename,
        size: attachment.content.byteLength,
      })),
    }),
  })
}

function toPublicCourseOutline(
  course: CourseOutlineRow,
  allSections: CourseSectionOutlineRow[],
): PublicCourseOutline {
  const listedSlugs = Array.isArray(course.sections) ? (course.sections as string[]) : []
  const bySlug = new Map(
    allSections
      .filter((section) => section.courseId === course.id)
      .map((section) => [section.slug, section]),
  )
  const anonymousViewer = { course: { isPaid: course.isPaid }, isAdmin: false, isEnrolled: false }

  const listed = listedSlugs
    .map((slug) => bySlug.get(slug))
    .filter(
      (section): section is CourseSectionOutlineRow => !!section && isSectionDisplayed(section),
    )
  const open = listed.filter(
    (section) => isSectionOpen(section) && !isSectionLocked(section, anonymousViewer),
  )
  const path = `/course/${encodeURIComponent(course.slug)}`

  return {
    title: course.title,
    description: toMetaDescription(course.shortDescription),
    path,
    lastModified: listed.reduce(
      (latest, section) => (section.lastModified > latest ? section.lastModified : latest),
      course.lastModified,
    ),
    sections: open.map((section) => ({
      title: section.title,
      path: `${path}/${section.sectionType === "ASSIGNMENT" ? "assignment" : "lesson"}/${encodeURIComponent(section.slug)}`,
      lastModified: section.lastModified,
    })),
  }
}
