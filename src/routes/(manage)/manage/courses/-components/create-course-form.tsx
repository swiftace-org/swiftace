import { useRouter } from "@tanstack/react-router"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"
import { toSubmitErrorMessage } from "@/lib/utils"

import { submitCreateCourseForm } from "../-functions/create-course"

export function CreateCourseForm() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string>()

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(undefined)

    try {
      const result = await submitCreateCourseForm({ data: { title } })
      if ("error" in result) {
        setError(result.error)
        return
      }
      setTitle("")
      toast.add({ type: "success", description: `Added course - ${result.course.title}` })
      await router.invalidate()
    } catch (error) {
      setError(toSubmitErrorMessage(error, "Failed to create course."))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup className="gap-2">
        <div className="flex items-end gap-2">
          <Field className="flex-1">
            <FieldLabel htmlFor="title">Create a new course</FieldLabel>
            <Input
              id="title"
              value={title}
              placeholder="Enter course title"
              onChange={(event) => setTitle(event.target.value)}
            />
          </Field>
          <Button type="submit" disabled={isSubmitting || !title.trim()}>
            {isSubmitting ? "Creating..." : "Create"}
          </Button>
        </div>
        <FieldError>{error}</FieldError>
      </FieldGroup>
    </form>
  )
}
