import { createServerFn } from "@tanstack/react-start"

import { readCourseForViewer } from "@/lib/utils.server"
import type { CourseSectionWithDescription } from "@/types/course"

import { readCourseCertificateSlugForOwner } from "../$courseSlug_.manage/participants/-lib/db.server"
import { readCompletedSectionIds, readCourseSectionsBySlugs } from "../-lib/db.server"
import { isSectionDisplayed, isSectionLocked, isSectionOpen, isValidUrl } from "../-lib/utils"
import { renderMarkdown } from "../-lib/utils.server"

const NO_COURSE = {
  course: null,
  sections: [] as CourseSectionWithDescription[],
  isEnrolled: false,
  courseProgress: 0,
  certificateSlug: null as string | null,
}

/**
 * The course page's data, for anyone allowed to see the course.
 *
 * Access is resolved by `readCourseForViewer`, which is what keeps a PRIVATE course from being
 * readable by slug. `DRAFT` sections are dropped, and every remaining section carries `isOpen`
 * and `isLocked` so the page can list one it must not link into.
 */
export const loadCoursePageData = createServerFn({ method: "GET" })
  .validator((data: { courseSlug: string }) => data)
  .handler(async ({ data }) => {
    const viewer = await readCourseForViewer(data.courseSlug)
    if (!viewer) return NO_COURSE

    const { course, account, isAdmin, isEnrolled } = viewer
    const {
      sections: orderedSlugsRaw,
      description,
      additionalInformation,
      ...courseDetails
    } = course
    const orderedSlugs = Array.isArray(orderedSlugsRaw) ? (orderedSlugsRaw as string[]) : []
    // An admin editing a course needs to see the drafts they're working on; nobody else does.
    const sections = (await readCourseSectionsBySlugs(course.id, orderedSlugs)).filter(
      (section) => isAdmin || isSectionDisplayed(section),
    )

    const completedSectionIds = new Set(
      account && isEnrolled
        ? await readCompletedSectionIds(
            sections.map((section) => section.id),
            account.id,
          )
        : [],
    )
    const certificateSlug =
      account && isEnrolled ? await readCourseCertificateSlugForOwner(course.id, account.id) : null

    const descriptionHtml = description ? (await renderMarkdown(description)).markup : null
    const additionalInformationHtml = additionalInformation
      ? (await renderMarkdown(additionalInformation)).markup
      : null
    const sectionsWithDescription = await Promise.all(
      sections.map(async (section) => {
        const isOpen = isAdmin || isSectionOpen(section)
        const isLocked = isSectionLocked(section, viewer)
        const listing = {
          ...section,
          isOpen,
          isLocked,
          // Worth badging only while it's doing something: for an enrollee every section is open.
          isPreview: !!section.alwaysOpen && !!course.isPaid && !isEnrolled && !isAdmin,
          isCompleted: completedSectionIds.has(section.id),
          // The teaser is part of the listing, so a HIDDEN section still shows its blurb.
          shortDescriptionHtml: section.shortDescription
            ? (await renderMarkdown(section.shortDescription)).markup
            : null,
        }

        // A section that can't be entered contributes its title and blurb and nothing else.
        // Gating the notebook and quiz endpoints isn't enough on its own: the notebook URL,
        // the video, and any plain-text resources would otherwise ride along in this payload
        // to every visitor — which is precisely what HIDDEN and the paywall are for.
        if (!isOpen || isLocked) {
          return {
            ...listing,
            videoUrl: null,
            description: null,
            descriptionHtml: null,
            resources: null,
            resourcesUrl: null,
            resourcesHtml: null,
            quizUrl: null,
            additionalInformation: null,
            additionalInformationHtml: null,
          }
        }

        const resourcesIsUrl = !!section.resources && isValidUrl(section.resources)
        return {
          ...listing,
          // Instructor notes hold planning docs and download links; only admins get them.
          additionalInformation: null,
          descriptionHtml: section.description
            ? (await renderMarkdown(section.description, { embeds: true })).markup
            : null,
          resourcesUrl: resourcesIsUrl ? section.resources : null,
          resourcesHtml:
            section.resources && !resourcesIsUrl
              ? (await renderMarkdown(section.resources, { embeds: true })).markup
              : null,
          additionalInformationHtml:
            isAdmin && section.additionalInformation
              ? (await renderMarkdown(section.additionalInformation)).markup
              : null,
        }
      }),
    )

    return {
      course: { ...courseDetails, descriptionHtml, additionalInformationHtml },
      sections: sectionsWithDescription,
      isEnrolled,
      courseProgress: toCourseProgress(sectionsWithDescription, {
        isEnrolled,
        hasCertificate: !!certificateSlug,
      }),
      certificateSlug,
    }
  })

/**
 * How far through the course an enrollee is, mirroring the legacy `_calculate_course_progress`:
 * the share of the listed, non-optional sections they've completed, and 100 outright once a
 * certificate has been issued — an admin can grant one before every section is ticked off.
 */
function toCourseProgress(
  sections: { isOptional: boolean; isCompleted: boolean }[],
  viewer: { isEnrolled: boolean; hasCertificate: boolean },
): number {
  if (!viewer.isEnrolled) return 0
  if (viewer.hasCertificate) return 100

  const required = sections.filter((section) => !section.isOptional)
  if (!required.length) return 0

  const completed = required.filter((section) => section.isCompleted).length
  return Math.ceil((completed / required.length) * 100)
}
