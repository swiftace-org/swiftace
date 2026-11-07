import { useRouter } from "@tanstack/react-router"
import { Plus } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/toast"
import { toSubmitErrorMessage } from "@/lib/utils"
import type { CourseSectionType } from "@/types/course"

import { submitAddCourseSectionForm } from "../-functions/add-course-section"
import { COURSE_SECTION_TYPE_LABELS } from "../-lib/constants"

export function AddCourseSectionForm({ courseSlug }: { courseSlug: string }) {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [sectionType, setSectionType] = useState<CourseSectionType>("LESSON")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string>()

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(undefined)

    try {
      const result = await submitAddCourseSectionForm({
        data: { courseSlug, title, sectionType },
      })
      if ("error" in result) {
        setError(result.error)
        return
      }
      setTitle("")
      setSectionType("LESSON")
      toast.add({ type: "success", description: `Added section - ${result.section.title}` })
      await router.invalidate()
    } catch (error) {
      setError(toSubmitErrorMessage(error, "Failed to add section."))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup className="gap-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field className="flex-1">
            <FieldLabel htmlFor="section-title">Add a section</FieldLabel>
            <Input
              id="section-title"
              value={title}
              placeholder="Enter section title"
              onChange={(event) => setTitle(event.target.value)}
            />
          </Field>
          <Field className="sm:w-40">
            <FieldLabel htmlFor="section-type">Type</FieldLabel>
            <Select
              items={COURSE_SECTION_TYPE_LABELS}
              value={sectionType}
              onValueChange={(value) => setSectionType(value as CourseSectionType)}
            >
              <SelectTrigger id="section-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LESSON">Lesson</SelectItem>
                <SelectItem value="ASSIGNMENT">Assignment</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Button type="submit" disabled={isSubmitting || !title.trim()}>
            <Plus />
            {isSubmitting ? "Adding..." : "Add"}
          </Button>
        </div>
        <FieldError>{error}</FieldError>
      </FieldGroup>
    </form>
  )
}
