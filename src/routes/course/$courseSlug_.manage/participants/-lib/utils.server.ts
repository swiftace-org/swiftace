import CourseCertificateEmail from "@/emails/course-certificate-email"
import { getSiteUrl, readEmailBrand, sendSesEmail } from "@/lib/utils.server"

import { CERTIFICATE_SLUG_PAD_LENGTH } from "./constants"

export async function sendCourseCertificateEmail({
  email,
  recipientName,
  courseSlug,
  courseTitle,
  certificateSlug,
}: {
  email: string
  recipientName: string
  courseSlug: string
  courseTitle: string
  certificateSlug: string
}): Promise<{ success: true } | { success: false; error: unknown }> {
  const siteUrl = getSiteUrl()

  return sendSesEmail({
    to: email,
    subject: `Your certificate for ${courseTitle}`,
    reactBody: CourseCertificateEmail({
      brand: await readEmailBrand(),
      recipientName,
      courseTitle,
      courseUrl: `${siteUrl}/course/${courseSlug}`,
      certificateUrl: `${siteUrl}/certificate/${certificateSlug}`,
    }),
  })
}

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

/**
 * Mirrors `IdGenerator.toSlug` from the legacy Flask app: the certificate's row id as a
 * decimal string, left-padded with `a` to six characters, base32-encoded with the `=`
 * padding stripped. Every certificate ever issued was named this way, so a regenerated one
 * has to land on the same slug or its existing links break.
 */
export function toCertificateSlug(certificateId: number): string {
  const digits = String(certificateId)
  const padded = "a".repeat(Math.max(0, CERTIFICATE_SLUG_PAD_LENGTH - digits.length)) + digits

  let slug = ""
  let buffer = 0
  let bits = 0
  for (let index = 0; index < padded.length; index++) {
    buffer = (buffer << 8) | padded.charCodeAt(index)
    bits += 8
    while (bits >= 5) {
      bits -= 5
      slug += BASE32_ALPHABET[(buffer >> bits) & 31]
      buffer &= (1 << bits) - 1
    }
  }
  if (bits > 0) slug += BASE32_ALPHABET[(buffer << (5 - bits)) & 31]

  return slug
}
