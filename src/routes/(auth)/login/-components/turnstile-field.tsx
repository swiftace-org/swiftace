import { Turnstile } from "@marsidev/react-turnstile"
import { useTheme } from "tanstack-router-theme-provider"

import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { useSiteConfig } from "@/lib/hooks"

export function TurnstileField({
  onSuccess,
  onExpire,
  error,
}: {
  onSuccess: (token: string) => void
  onExpire?: () => void
  error?: string
}) {
  // `theme` is "system" for most visitors, which says nothing about whether the page is dark.
  const { resolvedTheme } = useTheme()
  const { turnstile } = useSiteConfig().integrations
  if (!turnstile.enabled) return null

  return (
    <Field>
      <FieldLabel>Let us know you&apos;re human</FieldLabel>
      <Turnstile
        siteKey={turnstile.siteKey}
        options={{ theme: resolvedTheme ?? "auto", size: "flexible" }}
        onSuccess={onSuccess}
        onExpire={onExpire}
      />
      <FieldError>{error}</FieldError>
    </Field>
  )
}
