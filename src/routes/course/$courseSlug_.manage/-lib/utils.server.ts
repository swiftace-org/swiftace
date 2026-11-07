import {
  COURSE_IMAGE_MAX_BYTES,
  COURSE_IMAGE_TYPES,
  type CourseImageType,
} from "../../-lib/constants"
import { isCourseImagePath } from "../../-lib/utils"
import { detectBrandImageType } from "../../../(manage)/manage/config/-lib/utils.server"

/** From the bytes rather than the name, since it decides the `Content-Type` the image is served with. */
export function toCourseImageType(
  bytes: Uint8Array,
): { type: CourseImageType } | { error: string } {
  if (bytes.length > COURSE_IMAGE_MAX_BYTES) {
    return { error: `The image must be at most ${COURSE_IMAGE_MAX_BYTES / (1024 * 1024)} MB.` }
  }
  const type = detectBrandImageType(bytes)
  if (!type || !(COURSE_IMAGE_TYPES as readonly string[]).includes(type)) {
    return { error: "The image must be a PNG or JPEG." }
  }
  return { type: type as CourseImageType }
}

/**
 * The cover to save: an upload, none, or the one already stored, which may be a URL from before
 * uploads. Taking any other URL would let a crafted request point the course at anything.
 */
export function toCourseCover(
  submitted: string,
  current: string | null,
): { cover: string | null } | { error: string } {
  const cover = submitted.trim()
  if (!cover) return { cover: null }
  if (cover === current?.trim() || isCourseImagePath(cover)) return { cover }
  return { error: "Upload the course image rather than linking to one." }
}
