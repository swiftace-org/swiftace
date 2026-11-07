import { Trash2Icon, UploadIcon } from "lucide-react"
import { useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { useSiteConfig } from "@/lib/hooks"
import { cn, toSubmitErrorMessage } from "@/lib/utils"

import { submitCourseImage } from "../-functions/submit-course-image"
import { COURSE_IMAGE_ACCEPT, COURSE_IMAGE_MAX_BYTES } from "../../-lib/constants"

/** Uploads as soon as a file is picked, but the course only changes when the form is saved. */
export function CourseImageField({
  value,
  onChange,
  onUploadingChange,
}: {
  value: string
  onChange: (value: string) => void
  onUploadingChange: (isUploading: boolean) => void
}) {
  const { courseCoverUrl } = useSiteConfig().branding
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string>()

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError(undefined)
    setIsUploading(true)
    onUploadingChange(true)
    try {
      const formData = new FormData()
      formData.set("file", file)
      const result = await submitCourseImage({ data: formData })
      if ("error" in result) {
        setError(result.error)
        return
      }
      onChange(result.url)
    } catch (error) {
      setError(toSubmitErrorMessage(error, "Failed to upload the image."))
    } finally {
      setIsUploading(false)
      onUploadingChange(false)
    }
  }

  return (
    <Field>
      <FieldLabel htmlFor="course-image">Course Image</FieldLabel>
      <div className="aspect-video w-full overflow-hidden rounded-lg border bg-muted sm:w-80">
        <img
          alt=""
          src={value || courseCoverUrl}
          className={cn("size-full object-cover", !value && "opacity-60")}
        />
      </div>
      <FieldDescription>
        The cover on course cards and the course page, and the preview when the course is shared. A
        16:9 PNG or JPEG of up to {COURSE_IMAGE_MAX_BYTES / (1024 * 1024)} MB, e.g. 1280 × 720
        pixels. Without one, the default cover is used.
      </FieldDescription>
      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          id="course-image"
          type="file"
          className="hidden"
          accept={COURSE_IMAGE_ACCEPT}
          onChange={(event) => {
            void handleFile(event.target.files?.[0])
            // Cleared, so picking the same file again after an error still fires a change.
            event.target.value = ""
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          <UploadIcon />
          {isUploading ? "Uploading..." : value ? "Replace" : "Upload"}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isUploading}
            onClick={() => onChange("")}
          >
            <Trash2Icon />
            Remove
          </Button>
        )}
      </div>
      <FieldError>{error}</FieldError>
    </Field>
  )
}
