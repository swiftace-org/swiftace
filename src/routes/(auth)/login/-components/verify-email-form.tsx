import { useNavigate, useRouter } from "@tanstack/react-router"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { ACCOUNT_NAME_MAX_LENGTH } from "@/lib/config"
import { useSiteConfig } from "@/lib/hooks"
import { refreshSession } from "@/lib/utils"

import { resendVerificationEmail } from "../-functions/resend-verification-email"
import { submitVerifyEmailForm } from "../-functions/verify-email-code"
import { VERIFICATION_ATTEMPT_MINIMUM_GAP_SECONDS } from "../../-lib/constants"
import { getPostHogSessionId } from "../../../-lib/utils"
import { TurnstileField } from "./turnstile-field"

export function VerifyEmailForm({
  state,
  next,
  hasAccount,
  resendAllowedAtMs,
}: {
  /** The attempt's opaque `state_token`; resending issues a new attempt and a new one of these. */
  state: string
  next?: string
  hasAccount: boolean
  resendAllowedAtMs: number
}) {
  const navigate = useNavigate()
  const router = useRouter()
  const [currentState, setCurrentState] = useState(state)
  const [resendAllowedAt, setResendAllowedAt] = useState(resendAllowedAtMs)
  const [canResend, setCanResend] = useState(() => Date.now() >= resendAllowedAtMs)
  const [name, setName] = useState("")
  const [otp, setOtp] = useState("")
  const [turnstileToken, setTurnstileToken] = useState("")
  const [turnstileNonce, setTurnstileNonce] = useState(0)
  const [error, setError] = useState<string>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const isHumanVerified = !useSiteConfig().integrations.turnstile.enabled || !!turnstileToken

  useEffect(() => {
    if (canResend) return
    const timeout = setTimeout(() => setCanResend(true), resendAllowedAt - Date.now())
    return () => clearTimeout(timeout)
  }, [canResend, resendAllowedAt])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (otp.length !== 6 || !isHumanVerified || (!hasAccount && !name.trim())) return

    setIsSubmitting(true)
    setError(undefined)

    try {
      const result = await submitVerifyEmailForm({
        data: {
          state: currentState,
          otp,
          name,
          turnstileToken,
          posthogSessionId: await getPostHogSessionId(),
        },
      })

      if ("error" in result) {
        setError(result.error)
        setTurnstileToken("")
        setTurnstileNonce((nonce) => nonce + 1)
        return
      }

      await refreshSession(router)
      await navigate({ href: next ?? "/" })
    } catch (error) {
      console.error("VerifyEmailForm: submitVerifyEmailForm failed", error)
      setError("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleResend() {
    setIsResending(true)
    setError(undefined)

    try {
      const result = await resendVerificationEmail({ data: { state: currentState, next } })

      if ("error" in result) {
        setError(result.error)
        return
      }

      setCurrentState(result.stateToken)
      setResendAllowedAt(result.createdAtMs + VERIFICATION_ATTEMPT_MINIMUM_GAP_SECONDS * 1000)
      setCanResend(false)
    } catch (error) {
      console.error("VerifyEmailForm: resendVerificationEmail failed", error)
      setError("Something went wrong. Please try again.")
    } finally {
      setIsResending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup className="gap-4">
        <div className="flex justify-center">
          <InputOTP maxLength={6} value={otp} onChange={setOtp}>
            <InputOTPGroup>
              {Array.from({ length: 6 }).map((_, index) => (
                <InputOTPSlot key={index} index={index} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>
        {!hasAccount ? (
          <Field>
            <FieldLabel htmlFor="name">Full name</FieldLabel>
            <Input
              id="name"
              autoComplete="name"
              required
              maxLength={ACCOUNT_NAME_MAX_LENGTH}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
        ) : null}
        <TurnstileField
          key={turnstileNonce}
          onSuccess={setTurnstileToken}
          onExpire={() => setTurnstileToken("")}
        />
        <FieldError className="text-center">{error}</FieldError>
        <Button
          type="submit"
          className="w-full"
          disabled={
            isSubmitting || otp.length !== 6 || !isHumanVerified || (!hasAccount && !name.trim())
          }
        >
          {isSubmitting ? "Verifying..." : "Verify"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          disabled={!canResend || isResending}
          onClick={handleResend}
        >
          {isResending ? "Resending..." : "Resend code"}
        </Button>
      </FieldGroup>
    </form>
  )
}
