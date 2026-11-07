import { createFileRoute, redirect } from "@tanstack/react-router"

import { BlueLink } from "@/components/blue-link"
import { Skeleton } from "@/components/ui/skeleton"
import { useSiteConfig } from "@/lib/hooks"

import { VERIFICATION_ATTEMPT_MINIMUM_GAP_SECONDS } from "../-lib/constants"
import { InvalidAttemptError } from "./-components/invalid-attempt-error"
import { VerifyEmailForm } from "./-components/verify-email-form"
import { loadAttemptFromState } from "./-functions/load-attempt-from-state"
import { verifyMagicLinkToken } from "./-functions/verify-magic-link-token"

type VerifySearch = { token?: string; state?: string }

export const Route = createFileRoute("/(auth)/login/verify")({
  validateSearch: (search: Record<string, unknown>): VerifySearch => ({
    token: typeof search.token === "string" ? search.token : undefined,
    state: typeof search.state === "string" ? search.state : undefined,
  }),
  loaderDeps: ({ search }) => ({ token: search.token, state: search.state, next: search.next }),
  loader: async ({ deps }) => {
    if (deps.token) {
      const result = await verifyMagicLinkToken({ data: { token: deps.token } })
      if ("success" in result) {
        throw redirect({ href: deps.next ?? "/", reloadDocument: true })
      }
      return { error: result.error } as const
    }

    if (!deps.state) {
      return { error: "Invalid verification link." } as const
    }

    const attempt = await loadAttemptFromState({ data: { state: deps.state } })
    if (!attempt) {
      return { error: "Invalid verification link." } as const
    }

    return { attempt, state: deps.state } as const
  },
  pendingComponent: VerifyEmailPagePending,
  component: VerifyEmailPage,
})

function VerifyEmailPage() {
  const data = Route.useLoaderData()
  const { next } = Route.useSearch()
  const { siteName } = useSiteConfig().general

  if ("error" in data) {
    return <InvalidAttemptError message={data.error} next={next} />
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-xs space-y-6">
        <h1 className="text-center text-3xl font-semibold">
          {data.attempt.hasAccount ? `Log In to ${siteName}` : "Create your account"}
        </h1>
        <p className="text-muted-foreground text-sm">
          Please check your inbox. We&apos;ve sent a 6-digit verification code to{" "}
          <span className="font-medium text-foreground">{data.attempt.maskedEmail}</span>.
        </p>
        <VerifyEmailForm
          state={data.state}
          next={next}
          hasAccount={data.attempt.hasAccount}
          resendAllowedAtMs={
            data.attempt.createdAtMs + VERIFICATION_ATTEMPT_MINIMUM_GAP_SECONDS * 1000
          }
        />
        <div className="text-center text-sm">
          <BlueLink to="/login" search={{ next }}>
            ← Use a different email
          </BlueLink>
        </div>
      </div>
    </main>
  )
}

function VerifyEmailPagePending() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-xs space-y-6">
        <Skeleton className="mx-auto h-8 w-48" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="space-y-4">
          <div className="flex justify-center gap-2">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-9 w-9 rounded-md" />
            ))}
          </div>
          <Skeleton className="mx-auto h-16 w-64" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
        <Skeleton className="mx-auto h-4 w-36" />
      </div>
    </main>
  )
}
