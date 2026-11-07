import { useRouter } from "@tanstack/react-router"
import { Trash2 } from "lucide-react"
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
import type { ManagedUserProfile, UserDeletionPreview } from "@/types/user"

import { submitDeleteUser } from "../-functions/delete-user"
import { loadDeleteUserPreview } from "../-functions/load-delete-user-preview"
import { DeletionSummary, DeletionSummaryPending } from "./deletion-summary"

/**
 * A hard delete can't be undone, so the dialog spells out every count it will remove, offers the
 * certificates for download first, and asks for the email typed back before it enables.
 */
export function DeleteUserDialog({ profile }: { profile: ManagedUserProfile }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState<UserDeletionPreview>()
  const [confirmation, setConfirmation] = useState("")
  const [sendEmail, setSendEmail] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string>()

  async function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) return

    setPreview(undefined)
    setConfirmation("")
    setSendEmail(false)
    setError(undefined)
    try {
      const result = await loadDeleteUserPreview({ data: { userId: profile.id } })
      if ("error" in result) setError(result.error)
      else setPreview(result)
    } catch (error) {
      setError(toSubmitErrorMessage(error, "Failed to load what this user has."))
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setIsDeleting(true)
    setError(undefined)

    try {
      const result = await submitDeleteUser({ data: { userId: profile.id, sendEmail } })
      if ("error" in result) {
        setError(result.error)
        return
      }

      setOpen(false)
      toast.add({
        type: "success",
        description:
          sendEmail && !result.emailSent
            ? `Deleted ${profile.email}, but the email couldn't be sent.`
            : `Deleted ${profile.email}.`,
      })
      await router.navigate({ to: "/manage/users" })
    } catch (error) {
      setError(toSubmitErrorMessage(error, "Failed to delete the user."))
    } finally {
      setIsDeleting(false)
    }
  }

  const canDelete =
    preview !== undefined &&
    preview.blockers.length === 0 &&
    confirmation.trim().toLowerCase() === profile.email.toLowerCase()

  return (
    <>
      <Button variant="destructive" onClick={() => handleOpenChange(true)}>
        <Trash2 />
        Delete user
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Delete {profile.name || profile.email}?</DialogTitle>
            <DialogDescription>
              Permanently deletes the account and everything below. This can't be undone.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <FieldGroup className="gap-4">
              {preview ? (
                <DeletionSummary preview={preview} />
              ) : error ? null : (
                <DeletionSummaryPending />
              )}
              {preview?.blockers.length ? (
                <ul className="space-y-1 text-sm text-destructive">
                  {preview.blockers.map((blocker) => (
                    <li key={blocker}>{blocker}</li>
                  ))}
                </ul>
              ) : null}
              <Field>
                <FieldLabel htmlFor="delete-user-confirmation">
                  Type {profile.email} to confirm
                </FieldLabel>
                <Input
                  id="delete-user-confirmation"
                  autoComplete="off"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                />
              </Field>
              <Field orientation="horizontal">
                <Checkbox
                  id="delete-user-send-email"
                  checked={sendEmail}
                  onCheckedChange={(checked) => setSendEmail(checked === true)}
                />
                <FieldLabel htmlFor="delete-user-send-email" className="font-normal">
                  Email {profile.email} that their account was deleted, with support in cc
                </FieldLabel>
              </Field>
              <FieldError>{error}</FieldError>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="destructive" disabled={!canDelete || isDeleting}>
                  {isDeleting ? "Deleting..." : "Delete permanently"}
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
