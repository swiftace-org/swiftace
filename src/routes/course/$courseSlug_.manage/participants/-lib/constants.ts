/** The faces the certificate PDF is set in, served from `public/` and fetched at render time. */
export const CERTIFICATE_FONT_REGULAR_PATH = "/fonts/Inter-Regular.ttf"

export const CERTIFICATE_FONT_BOLD_PATH = "/fonts/Inter-Bold.ttf"

/**
 * `course_enrollments.certification_status`, mirroring `CourseCertificationStatus` in the
 * legacy Flask app. A revoked certificate is kept in `course_certificates` but must not be
 * linked anywhere.
 */
export const COURSE_CERTIFICATION_STATUS_REVOKED = "REVOKED"

/** What a revoked enrollment goes back to when an admin issues a certificate again. */
export const COURSE_CERTIFICATION_STATUS_PASS = "PASS"

/** Page sizes offered on the participants table, mirroring the legacy enrollments page. */
export const PARTICIPANTS_PER_PAGE_OPTIONS = [10, 20, 50, 100, 500]

export const DEFAULT_PARTICIPANTS_PER_PAGE = 20

/**
 * Width in pixels of the JPEG preview rendered from the certificate PDF, matching the
 * `preview_size` the legacy generator thumbnailed to.
 */
export const CERTIFICATE_PREVIEW_WIDTH = 1648

export const CERTIFICATE_PREVIEW_JPEG_QUALITY = 80

/** How wide the base32-encoded certificate id is padded before it becomes a slug. */
export const CERTIFICATE_SLUG_PAD_LENGTH = 6

/** What the certificate says a course is worth when an admin doesn't override it. */
export const DEFAULT_CERTIFICATE_COURSE_HOURS = 60

export const CERTIFICATE_COURSE_HOURS_MAX = 9999

export const PARTICIPANT_CERTIFICATE_FILTER_OPTIONS = [
  { value: "all", label: "Any certificate" },
  { value: "issued", label: "Certificate issued" },
  { value: "none", label: "No certificate" },
]

export const PARTICIPANT_CERTIFICATE_FILTER_LABELS = Object.fromEntries(
  PARTICIPANT_CERTIFICATE_FILTER_OPTIONS.map((option) => [option.value, option.label]),
)
