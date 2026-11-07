import { createServerFn } from "@tanstack/react-start"

import { adminMiddleware } from "@/lib/utils"

import { toCourseImageType } from "../-lib/utils.server"
import { toCourseImagePath } from "../../-lib/utils"
import { uploadCourseImage } from "../../-lib/utils.server"

/**
 * Stores a course image and hands back its path for the details form; the course itself only
 * changes when the form is saved. FormData, because it's a file.
 */
export const submitCourseImage = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: FormData) => {
    if (!(data instanceof FormData)) throw new Error("Invalid upload.")
    return data
  })
  .handler(async ({ data }): Promise<{ url: string } | { error: string }> => {
    const file = data.get("file")
    if (!(file instanceof File) || !file.size) return { error: "Choose an image to upload." }

    const bytes = new Uint8Array(await file.arrayBuffer())
    const result = toCourseImageType(bytes)
    if ("error" in result) return result

    try {
      return { url: toCourseImagePath(await uploadCourseImage(bytes, result.type)) }
    } catch (error) {
      console.error("submitCourseImage: upload failed", { error })
      return { error: "Could not upload the image. Please try again." }
    }
  })
