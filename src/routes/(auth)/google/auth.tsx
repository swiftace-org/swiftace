import { createFileRoute, redirect } from "@tanstack/react-router"

import { Skeleton } from "@/components/ui/skeleton"

import { InvalidAttemptError } from "../login/-components/invalid-attempt-error"
import { completeGoogleLogin } from "./-functions/complete-google-login"

type CallbackSearch = { code?: string; state?: string; error?: string }

export const Route = createFileRoute("/(auth)/google/auth")({
  validateSearch: (search: Record<string, unknown>): CallbackSearch => ({
    code: typeof search.code === "string" ? search.code : undefined,
    state: typeof search.state === "string" ? search.state : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
  }),
  loaderDeps: ({ search }) => ({ code: search.code, state: search.state, error: search.error }),
  loader: async ({ deps }) => {
    if (deps.error) {
      return { error: "Google login was cancelled." } as const
    }

    const result = await completeGoogleLogin({ data: { code: deps.code, state: deps.state } })
    if ("error" in result) {
      return { error: result.error } as const
    }

    throw redirect({ href: result.next ?? "/", reloadDocument: true })
  },
  pendingComponent: GoogleCallbackPending,
  component: GoogleCallbackPage,
})

function GoogleCallbackPage() {
  const data = Route.useLoaderData()
  return <InvalidAttemptError message={data.error} />
}

function GoogleCallbackPending() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-xs space-y-4 text-center">
        <Skeleton className="mx-auto h-8 w-48" />
        <Skeleton className="mx-auto h-4 w-64" />
      </div>
    </main>
  )
}
