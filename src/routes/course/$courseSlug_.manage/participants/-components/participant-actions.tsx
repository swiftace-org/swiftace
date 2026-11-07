import { useRouter } from "@tanstack/react-router"
import { Award, Mail, UserMinus } from "lucide-react"
import { useState } from "react"

import { IconButton } from "@/components/icon-button"
import { toast } from "@/components/ui/toast"
import { toSubmitErrorMessage } from "@/lib/utils"
import type { CourseParticipant } from "@/types/participant"

import { submitRemoveCourseParticipant } from "../-functions/remove-course-participant"
import { GenerateCertificateDialog } from "./generate-certificate-dialog"

export function ParticipantActions({
  courseSlug,
  courseTitle,
  participant,
}: {
  courseSlug: string
  courseTitle: string
  participant: CourseParticipant
}) {
  const router = useRouter()
  const [isRemoving, setIsRemoving] = useState(false)
  const [isCertificateDialogOpen, setIsCertificateDialogOpen] = useState(false)

  async function handleCopyEmail() {
    try {
      await navigator.clipboard.writeText(participant.email)
      toast.add({ type: "success", description: "Email copied." })
    } catch (error) {
      toast.add({
        type: "error",
        description: toSubmitErrorMessage(error, "Could not copy the email address."),
      })
    }
  }

  async function handleRemove() {
    const confirmed = window.confirm(
      `Remove ${participant.name} from this course? Their progress is kept, so adding them back restores it.`,
    )
    if (!confirmed) return

    setIsRemoving(true)
    try {
      const result = await submitRemoveCourseParticipant({
        data: { courseSlug, accountId: participant.accountId },
      })
      if ("error" in result) {
        toast.add({ type: "error", description: result.error })
        return
      }
      toast.add({ type: "success", description: `Removed ${participant.name} from the course.` })
      await router.invalidate()
    } catch (error) {
      toast.add({
        type: "error",
        description: toSubmitErrorMessage(error, "Failed to remove the participant."),
      })
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <IconButton tooltip="Copy email" onClick={handleCopyEmail}>
        <Mail />
      </IconButton>
      <IconButton
        tooltip={participant.certificateSlug ? "Regenerate certificate" : "Generate certificate"}
        className={participant.certificateSlug ? "text-primary" : undefined}
        onClick={() => setIsCertificateDialogOpen(true)}
      >
        <Award />
      </IconButton>
      <IconButton
        tooltip="Remove from course"
        className="hover:text-destructive"
        disabled={isRemoving}
        onClick={handleRemove}
      >
        <UserMinus />
      </IconButton>
      {/* Mounted only while open so each run starts from the participant's current details. */}
      {isCertificateDialogOpen ? (
        <GenerateCertificateDialog
          open
          onOpenChange={setIsCertificateDialogOpen}
          courseSlug={courseSlug}
          courseTitle={courseTitle}
          participant={participant}
        />
      ) : null}
    </div>
  )
}
