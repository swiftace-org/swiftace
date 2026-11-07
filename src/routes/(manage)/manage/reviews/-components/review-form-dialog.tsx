import { useRouter } from "@tanstack/react-router"
import { UploadIcon } from "lucide-react"
import { useRef, useState } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
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
import { getInitials, toSubmitErrorMessage } from "@/lib/utils"
import type { AdminReview, ReviewFormValues } from "@/types/review"

import { submitCreateReview } from "../-functions/create-review"
import { submitReviewAvatar } from "../-functions/submit-review-avatar"
import { submitUpdateReview } from "../-functions/update-review"
import {
  EMPTY_REVIEW_FORM_VALUES,
  REVIEW_AVATAR_ACCEPT,
  REVIEW_BODY_MAX_LENGTH,
  REVIEW_HEADLINE_MAX_LENGTH,
  REVIEW_NAME_MAX_LENGTH,
  REVIEW_VISIBILITY_LABELS,
  REVIEW_VISIBILITY_OPTIONS,
} from "../-lib/constants"
import { toReviewFields, toReviewFormValues } from "../-lib/utils"

/** Adds a review when `review` is null and edits it otherwise; remount it to reset the form. */
export function ReviewFormDialog({
  review,
  open,
  onOpenChange,
}: {
  review: AdminReview | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [values, setValues] = useState<ReviewFormValues>(() =>
    review ? toReviewFormValues(review) : EMPTY_REVIEW_FORM_VALUES,
  )
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string>()
  const fileInputRef = useRef<HTMLInputElement>(null)

  function updateField<K extends keyof ReviewFormValues>(key: K, value: ReviewFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function handleAvatarFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Cleared, so picking the same file again after an error still fires a change.
    event.target.value = ""
    if (!file) return

    setIsUploading(true)
    setError(undefined)
    try {
      const formData = new FormData()
      formData.set("file", file)
      const result = await submitReviewAvatar({ data: formData })
      if ("error" in result) {
        setError(result.error)
        return
      }
      updateField("avatarUrl", result.url)
    } catch (error) {
      setError(toSubmitErrorMessage(error, "Failed to upload the photo."))
    } finally {
      setIsUploading(false)
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const checked = toReviewFields(values)
    if ("error" in checked) {
      setError(checked.error)
      return
    }

    setIsSaving(true)
    setError(undefined)
    try {
      const result = review
        ? await submitUpdateReview({ data: { reviewId: review.id, values } })
        : await submitCreateReview({ data: { values } })
      if ("error" in result) {
        setError(result.error)
        return
      }
      onOpenChange(false)
      toast.add({
        type: "success",
        description: review ? "Review saved!" : `Review from ${result.review.name} added!`,
      })
      await router.invalidate()
    } catch (error) {
      setError(toSubmitErrorMessage(error, "Failed to save the review."))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{review ? "Edit review" : "Add review"}</DialogTitle>
          <DialogDescription>
            {review
              ? `Changes show on the landing page as soon as you save.`
              : "New reviews go to the end of the list; drag them up to feature them."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup className="gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="review-name">Name</FieldLabel>
                <Input
                  id="review-name"
                  required
                  maxLength={REVIEW_NAME_MAX_LENGTH}
                  value={values.name}
                  onChange={(event) => updateField("name", event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="review-headline">Headline</FieldLabel>
                <Input
                  id="review-headline"
                  maxLength={REVIEW_HEADLINE_MAX_LENGTH}
                  placeholder="Data Analyst, Acme, London"
                  value={values.headline}
                  onChange={(event) => updateField("headline", event.target.value)}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="review-body">Review</FieldLabel>
              <Textarea
                id="review-body"
                required
                rows={7}
                maxLength={REVIEW_BODY_MAX_LENGTH}
                className="field-sizing-fixed max-h-80"
                value={values.body}
                onChange={(event) => updateField("body", event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="review-avatar-url">Avatar URL</FieldLabel>
              <div className="flex items-center gap-3">
                <Avatar className="size-9">
                  {values.avatarUrl.trim() && <AvatarImage src={values.avatarUrl.trim()} alt="" />}
                  <AvatarFallback>{getInitials(values.name) || "?"}</AvatarFallback>
                </Avatar>
                <Input
                  id="review-avatar-url"
                  placeholder="https://…"
                  value={values.avatarUrl}
                  onChange={(event) => updateField("avatarUrl", event.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadIcon />
                  {isUploading ? "Uploading..." : "Upload"}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={REVIEW_AVATAR_ACCEPT}
                  className="hidden"
                  aria-label="Upload a photo"
                  onChange={handleAvatarFile}
                />
              </div>
              <FieldDescription>
                A link to the reviewer&apos;s photo, or upload a PNG, JPEG or WebP of up to 1 MB.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="review-source-url">Source URL</FieldLabel>
              <Input
                id="review-source-url"
                type="url"
                placeholder="https://www.linkedin.com/in/…"
                value={values.sourceUrl}
                onChange={(event) => updateField("sourceUrl", event.target.value)}
              />
              <FieldDescription>
                Where the review was posted, or the reviewer&apos;s LinkedIn profile.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="review-visibility">Visibility</FieldLabel>
              <Select
                items={REVIEW_VISIBILITY_LABELS}
                value={values.visibility}
                onValueChange={(value) => updateField("visibility", value as string)}
              >
                <SelectTrigger id="review-visibility" className="h-9! w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REVIEW_VISIBILITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>Private reviews stay off the landing page.</FieldDescription>
            </Field>
            <FieldError>{error}</FieldError>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving || isUploading}>
                {isSaving ? "Saving..." : review ? "Save" : "Add review"}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}
