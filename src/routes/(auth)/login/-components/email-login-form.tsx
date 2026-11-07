import { useNavigate } from "@tanstack/react-router"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useSiteConfig } from "@/lib/hooks"

import { submitEmailLoginForm } from "../-functions/submit-email-login"
import { TurnstileField } from "./turnstile-field"

export function EmailLoginForm({ next }: { next?: string }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [turnstileToken, setTurnstileToken] = useState("")
  const [turnstileNonce, setTurnstileNonce] = useState(0)
  const [error, setError] = useState<string>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isHumanVerified = !useSiteConfig().integrations.turnstile.enabled || !!turnstileToken

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!isHumanVerified) {
      setError("Please complete the verification.")
      return
    }

    setIsSubmitting(true)
    setError(undefined)

    try {
      const result = await submitEmailLoginForm({ data: { email, turnstileToken, next } })

      if ("error" in result) {
        setError(result.error)
        setTurnstileToken("")
        setTurnstileNonce((nonce) => nonce + 1)
        return
      }

      await navigate({
        to: "/login/verify",
        search: { state: result.stateToken, next },
      })
    } catch (error) {
      console.error("EmailLoginForm: submitEmailLoginForm failed", error)
      setError("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <TurnstileField
          key={turnstileNonce}
          onSuccess={setTurnstileToken}
          onExpire={() => setTurnstileToken("")}
        />
        <FieldError>{error}</FieldError>
        <Button type="submit" className="w-full" disabled={isSubmitting || !isHumanVerified}>
          {isSubmitting ? "Sending..." : "Continue with Email"}
        </Button>
      </FieldGroup>
    </form>
  )
}
