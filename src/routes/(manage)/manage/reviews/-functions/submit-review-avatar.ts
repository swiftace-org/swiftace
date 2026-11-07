import { createServerFn } from "@tanstack/react-start"

import { adminMiddleware } from "@/lib/utils"

import { REVIEW_AVATAR_MAX_BYTES, REVIEW_AVATAR_TYPES } from "../-lib/constants"
import { type ReviewAvatarType, toReviewAvatarUrl, uploadReviewAvatar } from "../-lib/utils.server"
import { detectBrandImageType } from "../../config/-lib/utils.server"

/**
 * Stores a reviewer's photo and hands back its URL for the dialog's avatar field; the review
 * itself only changes when the dialog is saved. FormData, because it's a file.
 */
export const submitReviewAvatar = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: FormData) => {
    if (!(data instanceof FormData)) throw new Error("Invalid upload.")
    return data
  })
  .handler(async ({ data }): Promise<{ url: string } | { error: string }> => {
    const file = data.get("file")
    if (!(file instanceof File) || !file.size) return { error: "Choose a photo to upload." }
    if (file.size > REVIEW_AVATAR_MAX_BYTES) return { error: "The photo must be at most 1 MB." }

    const bytes = new Uint8Array(await file.arrayBuffer())
    // From the bytes rather than the name, since it decides the `Content-Type` it's served with.
    const type = detectBrandImageType(bytes)
    if (!type || !(REVIEW_AVATAR_TYPES as readonly string[]).includes(type)) {
      return { error: "The photo must be a PNG, JPEG or WebP." }
    }

    try {
      return { url: toReviewAvatarUrl(await uploadReviewAvatar(bytes, type as ReviewAvatarType)) }
    } catch (error) {
      console.error("submitReviewAvatar: upload failed", { error })
      return { error: "Could not upload the photo. Please try again." }
    }
  })
