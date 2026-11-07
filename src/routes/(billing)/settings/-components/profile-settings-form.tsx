import { useRouter } from "@tanstack/react-router"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"
import { refreshSession, toSubmitErrorMessage } from "@/lib/utils"
import type { Account } from "@/types/account"

import { submitProfileSettingsForm } from "../-functions/update-profile-settings"

export function ProfileSettingsForm({ account }: { account: Account }) {
  const router = useRouter()
  const [name, setName] = useState(account.name)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string>()

  const hasChanges = name.trim() !== account.name.trim() && name.trim().length > 0

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(undefined)

    try {
      const result = await submitProfileSettingsForm({ data: { name } })
      if ("error" in result) {
        setError(result.error)
        return
      }
      setName(result.name)
      toast.add({ type: "success", description: "Profile updated." })
      await refreshSession(router)
    } catch (error) {
      setError(toSubmitErrorMessage(error, "Failed to update your profile."))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" value={account.email} disabled readOnly />
        </Field>
        <Field>
          <FieldLabel htmlFor="name">Full name</FieldLabel>
          <Input
            id="name"
            value={name}
            required
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <FieldError>{error}</FieldError>
        <Button type="submit" className="w-fit" disabled={isSubmitting || !hasChanges}>
          {isSubmitting ? "Updating..." : "Update profile"}
        </Button>
      </FieldGroup>
    </form>
  )
}
