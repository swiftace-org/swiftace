import { useRouter } from "@tanstack/react-router"
import { UserPlus } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"
import { toSubmitErrorMessage } from "@/lib/utils"

import { submitAddCourseParticipant } from "../-functions/add-course-participant"

export function AddParticipantForm({ courseSlug }: { courseSlug: string }) {
  const router = useRouter()
  const [identifier, setIdentifier] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string>()

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(undefined)

    try {
      const result = await submitAddCourseParticipant({ data: { courseSlug, identifier } })
      if ("error" in result) {
        setError(result.error)
        return
      }
      setIdentifier("")
      toast.add({ type: "success", description: `Added ${result.participant.name} to the course.` })
      await router.invalidate()
    } catch (error) {
      setError(toSubmitErrorMessage(error, "Failed to add the participant."))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup className="gap-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field className="flex-1 sm:max-w-sm">
            <FieldLabel htmlFor="participant-identifier">Add a participant</FieldLabel>
            <Input
              id="participant-identifier"
              value={identifier}
              placeholder="Enter a username or email address"
              onChange={(event) => setIdentifier(event.target.value)}
            />
          </Field>
          <Button type="submit" disabled={isSubmitting || !identifier.trim()}>
            <UserPlus />
            {isSubmitting ? "Adding..." : "Add"}
          </Button>
        </div>
        <FieldError>{error}</FieldError>
      </FieldGroup>
    </form>
  )
}
