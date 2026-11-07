import { createServerFn } from "@tanstack/react-start"

import { COURSE_TITLE_MAX_LENGTH } from "@/lib/config"
import { readAccountById, readCourseBySlugForAdmin, readCourseEnrollment } from "@/lib/db.server"
import { runInTransaction } from "@/lib/schema.server"
import { adminMiddleware } from "@/lib/utils"
import { generateToken, getSiteConfig, getSiteUrl } from "@/lib/utils.server"

import { findUnrenderableCharacters, renderCertificate } from "../-lib/certificate.server"
import {
  CERTIFICATE_COURSE_HOURS_MAX,
  COURSE_CERTIFICATION_STATUS_PASS,
  COURSE_CERTIFICATION_STATUS_REVOKED,
} from "../-lib/constants"
import {
  createCourseCertificate,
  readCourseCertificateForOwner,
  updateCourseCertificate,
  updateCourseEnrollmentCertificationStatus,
} from "../-lib/db.server"
import { sendCourseCertificateEmail, toCertificateSlug } from "../-lib/utils.server"
import { isValidUrl } from "../../../-lib/utils"
import { uploadCertificateAssets } from "../../../../certificate/-lib/utils.server"

type GenerateCertificateResult = { certificateSlug: string; emailSent: boolean } | { error: string }

/**
 * Issues (or re-issues) a participant's certificate: renders the PDF and preview, uploads both,
 * and records the result. Re-issuing lands on the same slug, since it derives from the row id, so
 * existing links keep working. Nothing changes until the render and upload have both succeeded.
 */
export const submitGenerateParticipantCertificate = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(
    (data: {
      courseSlug: string
      accountId: number
      printedName: string
      courseTitle: string
      courseHours: number
      sendEmail: boolean
    }) => data,
  )
  .handler(async ({ data }): Promise<GenerateCertificateResult> => {
    const printedName = data.printedName.trim()
    const courseTitle = data.courseTitle.trim()

    if (!printedName) return { error: "Enter the name to print on the certificate." }
    if (!courseTitle) return { error: "Enter the course title to print on the certificate." }
    if (courseTitle.length > COURSE_TITLE_MAX_LENGTH) {
      return { error: `Keep the course title under ${COURSE_TITLE_MAX_LENGTH} characters.` }
    }
    if (
      !Number.isInteger(data.courseHours) ||
      data.courseHours < 1 ||
      data.courseHours > CERTIFICATE_COURSE_HOURS_MAX
    ) {
      return { error: `Hours of coursework must be between 1 and ${CERTIFICATE_COURSE_HOURS_MAX}.` }
    }

    const course = await readCourseBySlugForAdmin(data.courseSlug)
    if (!course) return { error: "Course not found." }
    if (!course.certificateTemplate) {
      return { error: "This course has no certificate template. Add one under Details first." }
    }
    // `certificate_template` is a free-text column an admin types into, and the renderer
    // fetches whatever it holds, so it is checked here the way the notebook fetch checks
    // `course_sections.resources`.
    if (!isValidUrl(course.certificateTemplate)) {
      return { error: "This course's certificate template isn't a valid URL." }
    }

    const account = await readAccountById(data.accountId)
    if (!account) return { error: "Participant not found." }

    const enrollment = await readCourseEnrollment(course.id, account.id)
    if (!enrollment) return { error: `${account.name} is not a participant of this course.` }

    const siteUrl = getSiteUrl()

    // Inter can't draw every script, and a certificate of empty boxes is worse than none.
    let unrenderable: string[]
    try {
      unrenderable = await findUnrenderableCharacters(siteUrl, `${printedName} ${courseTitle}`)
    } catch (error) {
      console.error("submitGenerateParticipantCertificate: failed to load fonts", error)
      return { error: "Couldn't load the certificate fonts. Please try again." }
    }
    if (unrenderable.length) {
      return {
        error: `The certificate font can't print ${unrenderable.join(" ")} — use a Latin spelling instead.`,
      }
    }

    // The slug comes from the row id, so a first-time certificate needs its row before it
    // can be rendered. It stays soft-deleted until the assets are actually in the bucket.
    const existing = await readCourseCertificateForOwner(course.id, account.id)
    let certificate = existing
    if (!certificate) {
      try {
        certificate = await createCourseCertificate({
          courseId: course.id,
          ownerId: account.id,
          slug: generateToken(),
        })
      } catch (error) {
        console.error("submitGenerateParticipantCertificate: failed to reserve a slug", error)
        return { error: "Couldn't start this certificate. Please try again." }
      }
    }

    const slug = toCertificateSlug(certificate.id)
    const issuedAt = new Date()

    try {
      const assets = await renderCertificate({
        siteUrl,
        templateUrl: course.certificateTemplate,
        name: printedName,
        courseTitle,
        organizationName: (await getSiteConfig()).general.siteName,
        courseHours: data.courseHours,
        issuedAt,
        slug,
      })
      await uploadCertificateAssets(slug, assets)
    } catch (error) {
      console.error("submitGenerateParticipantCertificate: failed to render certificate", error)
      return { error: "Couldn't generate the certificate. Check the template URL and try again." }
    }

    try {
      await runInTransaction(async (tx) => {
        await updateCourseCertificate(certificate.id, { slug, printedName, issuedAt }, tx)
        // A withdrawn certificate hides the row everywhere; issuing again has to undo that.
        if (enrollment.certificationStatus === COURSE_CERTIFICATION_STATUS_REVOKED) {
          await updateCourseEnrollmentCertificationStatus(
            course.id,
            account.id,
            COURSE_CERTIFICATION_STATUS_PASS,
            tx,
          )
        }
      })
    } catch (error) {
      console.error("submitGenerateParticipantCertificate: failed to save certificate", error)
      return { error: "The certificate was generated but couldn't be saved. Please try again." }
    }

    if (!data.sendEmail) return { certificateSlug: slug, emailSent: false }

    // The certificate exists either way, so a bounced email is reported, not thrown.
    const email = await sendCourseCertificateEmail({
      email: account.email,
      recipientName: account.name,
      courseSlug: course.slug,
      courseTitle: course.title,
      certificateSlug: slug,
    })

    return { certificateSlug: slug, emailSent: email.success }
  })
