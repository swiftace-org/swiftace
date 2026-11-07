import { useRouter } from "@tanstack/react-router"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { VideoEmbed } from "@/components/video-embed"
import {
  COURSE_TITLE_MAX_LENGTH,
  COURSE_VISIBILITY_LABELS,
  COURSE_VISIBILITY_OPTIONS,
  DEFAULT_COURSE_VISIBILITY,
} from "@/lib/config"
import { toSubmitErrorMessage } from "@/lib/utils"
import type { AdminCourseDetails, CourseDetailsFormValues } from "@/types/course"

import { submitCourseDetailsForm } from "../-functions/update-course-details"
import { CourseImageField } from "./course-image-field"

function toFormValues(course: AdminCourseDetails): CourseDetailsFormValues {
  return {
    title: course.title,
    slug: course.slug,
    shortDescription: course.shortDescription ?? "",
    description: course.description ?? "",
    cover: course.cover ?? "",
    visibility: course.visibility ?? DEFAULT_COURSE_VISIBILITY,
    videoUrl: course.videoUrl ?? "",
    certificateTemplate: course.certificateTemplate ?? "",
    isPaid: course.isPaid ?? false,
    stripeProductId: course.stripeProductId ?? "",
    additionalInformation: course.additionalInformation ?? "",
  }
}

export function CourseDetailsForm({ course }: { course: AdminCourseDetails }) {
  const router = useRouter()
  const [values, setValues] = useState<CourseDetailsFormValues>(() => toFormValues(course))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string>()

  function updateField<Key extends keyof CourseDetailsFormValues>(
    key: Key,
    value: CourseDetailsFormValues[Key],
  ) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(undefined)

    try {
      const result = await submitCourseDetailsForm({
        data: { courseSlug: course.slug, values },
      })
      if ("error" in result) {
        setError(result.error)
        return
      }

      toast.add({ type: "success", description: "Course details updated." })
      if (result.course.slug !== course.slug) {
        await router.navigate({
          to: "/course/$courseSlug/manage/details",
          params: { courseSlug: result.course.slug },
        })
      }
      await router.invalidate()
    } catch (error) {
      setError(toSubmitErrorMessage(error, "Failed to update course."))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl">
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="title">Title</FieldLabel>
          <Input
            id="title"
            value={values.title}
            maxLength={COURSE_TITLE_MAX_LENGTH}
            required
            onChange={(event) => updateField("title", event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="slug">Course Slug</FieldLabel>
          <Input
            id="slug"
            value={values.slug}
            required
            onChange={(event) => updateField("slug", event.target.value)}
          />
        </Field>
        <CourseImageField
          value={values.cover}
          onChange={(cover) => updateField("cover", cover)}
          onUploadingChange={setIsUploading}
        />
        <Field>
          <FieldLabel htmlFor="short-description">Short Description</FieldLabel>
          <Textarea
            id="short-description"
            value={values.shortDescription}
            placeholder="Enter a short description"
            required
            onChange={(event) => updateField("shortDescription", event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea
            id="description"
            value={values.description}
            placeholder="Enter a description for the course (Markdown supported)"
            className="min-h-32"
            onChange={(event) => updateField("description", event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="visibility">Visibility</FieldLabel>
          <Select
            items={COURSE_VISIBILITY_LABELS}
            value={values.visibility}
            onValueChange={(value) => updateField("visibility", value as string)}
          >
            <SelectTrigger id="visibility" className="h-9! w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COURSE_VISIBILITY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="video-url">Video Link</FieldLabel>
          <Input
            id="video-url"
            value={values.videoUrl}
            placeholder="Enter a YouTube or Descript video URL"
            onChange={(event) => updateField("videoUrl", event.target.value)}
          />
          {values.videoUrl ? <VideoEmbed src={values.videoUrl} /> : null}
        </Field>
        <Field>
          <FieldLabel htmlFor="certificate-template">Certificate Template (PDF link)</FieldLabel>
          <Input
            id="certificate-template"
            value={values.certificateTemplate}
            placeholder="Enter a public PDF link"
            onChange={(event) => updateField("certificateTemplate", event.target.value)}
          />
        </Field>
        <Field orientation="horizontal">
          <Checkbox
            id="is-paid"
            checked={values.isPaid}
            onCheckedChange={(checked) => updateField("isPaid", checked === true)}
          />
          <FieldLabel htmlFor="is-paid" className="font-normal">
            Is Paid
          </FieldLabel>
        </Field>
        <Field>
          <FieldLabel htmlFor="stripe-product-id">Stripe Product ID</FieldLabel>
          <Input
            id="stripe-product-id"
            value={values.stripeProductId}
            onChange={(event) => updateField("stripeProductId", event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="additional-information">Additional Information</FieldLabel>
          <Textarea
            id="additional-information"
            value={values.additionalInformation}
            placeholder="Enter additional information about the course (Markdown supported)"
            onChange={(event) => updateField("additionalInformation", event.target.value)}
          />
        </Field>
        <FieldError>{error}</FieldError>
        <Button type="submit" className="w-fit" disabled={isSubmitting || isUploading}>
          {isSubmitting ? "Saving..." : "Save changes"}
        </Button>
      </FieldGroup>
    </form>
  )
}
