import { Paperclip, X } from "lucide-react"
import { useRef, useState } from "react"

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
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { useSiteConfig } from "@/lib/hooks"
import { formatFileSize, toSubmitErrorMessage } from "@/lib/utils"
import type { Account } from "@/types/account"

import { submitSupportRequest } from "../routes/-functions/submit-support-request"
import {
  SUPPORT_ATTACHMENT_ACCEPT,
  SUPPORT_ATTACHMENT_MAX_BYTES,
  SUPPORT_ATTACHMENT_MAX_COUNT,
  SUPPORT_MESSAGE_MAX_LENGTH,
  SUPPORT_SUBJECT_MAX_LENGTH,
} from "../routes/-lib/constants"
import { toSupportAttachmentError } from "../routes/-lib/utils"

export function SupportDialog({
  open,
  onOpenChange,
  account,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: Account
}) {
  const { siteName } = useSiteConfig().general
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string>()

  function handleFilesSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? [])
    // Cleared so picking the same file again after removing it still fires `change`.
    event.target.value = ""

    const next = [...files, ...selected]
    const attachmentError = toSupportAttachmentError(next)
    if (attachmentError) {
      setError(attachmentError)
      return
    }

    setError(undefined)
    setFiles(next)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setIsSending(true)
    setError(undefined)

    const formData = new FormData()
    formData.set("subject", subject)
    formData.set("message", message)
    files.forEach((file) => formData.append("attachments", file))

    try {
      const result = await submitSupportRequest({ data: formData })
      if ("error" in result) {
        setError(result.error)
        return
      }

      onOpenChange(false)
      setSubject("")
      setMessage("")
      setFiles([])
      toast.add({
        type: "success",
        description: `Message sent. A copy is on its way to ${account.email}.`,
      })
    } catch (error) {
      setError(toSubmitErrorMessage(error, "Failed to send your message."))
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Contact support</DialogTitle>
          <DialogDescription>
            Send a message to the {siteName} team. A copy will be emailed to {account.email}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="support-subject">Subject</FieldLabel>
              <Input
                id="support-subject"
                required
                maxLength={SUPPORT_SUBJECT_MAX_LENGTH}
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="support-message">Message</FieldLabel>
              <Textarea
                id="support-message"
                required
                rows={5}
                maxLength={SUPPORT_MESSAGE_MAX_LENGTH}
                className="field-sizing-fixed max-h-64"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="support-attachments">Attachments</FieldLabel>
              <input
                ref={fileInputRef}
                id="support-attachments"
                type="file"
                multiple
                accept={SUPPORT_ATTACHMENT_ACCEPT}
                className="sr-only"
                onChange={handleFilesSelected}
              />
              {files.length > 0 && (
                <ul className="space-y-1">
                  {files.map((file, index) => (
                    <li
                      // oxlint-disable-next-line react/no-array-index-key -- two picks can share a name
                      key={`${index}-${file.name}`}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{file.name}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {formatFileSize(file.size)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="ml-auto shrink-0 text-muted-foreground"
                        aria-label={`Remove ${file.name}`}
                        onClick={() => setFiles(files.filter((_, other) => other !== index))}
                      >
                        <X />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit"
                disabled={files.length >= SUPPORT_ATTACHMENT_MAX_COUNT}
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip />
                Add files
              </Button>
              <FieldDescription>
                Up to {SUPPORT_ATTACHMENT_MAX_COUNT} images, PDFs, documents, notebooks or text
                files, {formatFileSize(SUPPORT_ATTACHMENT_MAX_BYTES)} each.
              </FieldDescription>
            </Field>
            <FieldError>{error}</FieldError>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSending}>
                {isSending ? "Sending..." : "Send"}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}
