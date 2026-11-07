import { useRouter } from "@tanstack/react-router"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"
import { toSubmitErrorMessage } from "@/lib/utils"
import type { CourseParticipant } from "@/types/participant"

import { submitGenerateParticipantCertificate } from "../-functions/generate-participant-certificate"
import { DEFAULT_CERTIFICATE_COURSE_HOURS } from "../-lib/constants"

/**
 * What goes on the certificate is an editorial decision, not a lookup: the printed name is
 * often a fuller version of the account's, and the title and hours can differ from the
 * course's own for a cohort that ran differently. Everything is pre-filled and editable.
 */
export function GenerateCertificateDialog({
  open,
  onOpenChange,
  courseSlug,
  courseTitle,
  participant,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseSlug: string
  courseTitle: string
  participant: CourseParticipant
}) {
  const router = useRouter()
  const [printedName, setPrintedName] = useState(participant.name)
  const [title, setTitle] = useState(courseTitle)
  const [hours, setHours] = useState(String(DEFAULT_CERTIFICATE_COURSE_HOURS))
  const [sendEmail, setSendEmail] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string>()

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setIsGenerating(true)
    setError(undefined)

    try {
      const result = await submitGenerateParticipantCertificate({
        data: {
          courseSlug,
          accountId: participant.accountId,
          printedName,
          courseTitle: title,
          courseHours: Number(hours),
          sendEmail,
        },
      })
      if ("error" in result) {
        setError(result.error)
        return
      }

      onOpenChange(false)
      toast.add({
        type: "success",
        description:
          sendEmail && !result.emailSent
            ? `Certificate issued to ${printedName}, but the email couldn't be sent.`
            : `Certificate issued to ${printedName}.`,
      })
      await router.invalidate()
    } catch (error) {
      setError(toSubmitErrorMessage(error, "Failed to generate the certificate."))
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {participant.certificateSlug ? "Regenerate certificate" : "Generate certificate"}
          </DialogTitle>
          <DialogDescription>
            {participant.certificateSlug
              ? `Replaces the certificate already issued to ${participant.name}. The link stays the same.`
              : `Issues a certificate to ${participant.name} for this course.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="certificate-name">Name on the certificate</FieldLabel>
              <Input
                id="certificate-name"
                value={printedName}
                onChange={(event) => setPrintedName(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="certificate-course-title">Course title</FieldLabel>
              <Input
                id="certificate-course-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="certificate-hours">Hours of coursework</FieldLabel>
              <Input
                id="certificate-hours"
                type="number"
                min={1}
                value={hours}
                onChange={(event) => setHours(event.target.value)}
              />
            </Field>
            <Field orientation="horizontal">
              <Checkbox
                id="certificate-send-email"
                checked={sendEmail}
                onCheckedChange={(checked) => setSendEmail(checked === true)}
              />
              <FieldLabel htmlFor="certificate-send-email" className="font-normal">
                Email {participant.email}
              </FieldLabel>
            </Field>
            <FieldError>{error}</FieldError>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isGenerating}>
                {isGenerating ? "Generating..." : "Generate"}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}
