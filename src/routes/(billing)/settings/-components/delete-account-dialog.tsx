import { useRouter } from "@tanstack/react-router"
import { Trash2 } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
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
import { refreshSession, toSubmitErrorMessage } from "@/lib/utils"
import type { Account } from "@/types/account"
import type { UserDeletionPreview } from "@/types/user"

import { loadDeleteAccountPreview } from "../-functions/load-delete-account-preview"
import { submitDeleteAccount } from "../-functions/submit-delete-account"
import {
  DeletionSummary,
  DeletionSummaryPending,
} from "../../../(manage)/manage/users/$userId/-components/deletion-summary"

export function DeleteAccountDialog({ account }: { account: Account }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState<UserDeletionPreview>()
  const [confirmation, setConfirmation] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string>()

  async function handleOpenChange(nextOpen: boolean) {
    if (isDeleting) return
    setOpen(nextOpen)
    if (!nextOpen) return

    setPreview(undefined)
    setConfirmation("")
    setError(undefined)
    try {
      const result = await loadDeleteAccountPreview()
      setPreview(result)
    } catch (error) {
      setError(toSubmitErrorMessage(error, "Failed to load your account data."))
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!canDelete || isDeleting) return
    setIsDeleting(true)
    setError(undefined)

    try {
      const result = await submitDeleteAccount({ data: { confirmation } })
      if ("error" in result) {
        setError(result.error)
        return
      }

      setOpen(false)
      toast.add({
        type: "success",
        description: !result.emailSent
          ? "Your account was deleted, but the confirmation email could not be sent."
          : "Your account was deleted. A confirmation email has been sent, with support in cc.",
      })
      await refreshSession(router, "/")
    } catch (error) {
      setError(toSubmitErrorMessage(error, "Failed to delete your account."))
    } finally {
      setIsDeleting(false)
    }
  }

  const canDelete =
    preview !== undefined &&
    preview.blockers.length === 0 &&
    confirmation.trim().toLowerCase() === account.email.toLowerCase()

  return (
    <>
      <Button type="button" variant="destructive" onClick={() => handleOpenChange(true)}>
        <Trash2 />
        Delete Account
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="max-h-[90dvh] overflow-y-auto sm:max-w-lg"
          showCloseButton={!isDeleting}
        >
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              Permanently deletes the account and everything below. This can't be undone.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <FieldGroup className="gap-4">
              {preview ? (
                <DeletionSummary preview={preview} selfService />
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
                <FieldLabel htmlFor="delete-account-confirmation">
                  Type {account.email} to confirm
                </FieldLabel>
                <Input
                  id="delete-account-confirmation"
                  autoComplete="off"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                />
              </Field>
              <p className="text-sm text-muted-foreground">
                We'll email {account.email} after deletion, with support in cc.
              </p>
              <FieldError>{error}</FieldError>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isDeleting}
                  onClick={() => handleOpenChange(false)}
                >
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
