import { Link, createFileRoute, redirect, useRouter, useRouterState } from "@tanstack/react-router"

import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ROBOTS_NOINDEX_META } from "@/lib/config"
import { toSubmitErrorMessage } from "@/lib/utils"
import type { SubscriptionInterval } from "@/types/subscription"

import { submitCheckoutSession } from "./-functions/submit-checkout-session"

export const Route = createFileRoute("/(billing)/pricing/subscribe")({
  head: () => ({ meta: [ROBOTS_NOINDEX_META] }),
  validateSearch: (
    search: Record<string, unknown>,
  ): { plan?: SubscriptionInterval; courseSlug?: string } => ({
    plan: search.plan === "month" || search.plan === "year" ? search.plan : undefined,
    courseSlug: typeof search.courseSlug === "string" ? search.courseSlug : undefined,
  }),
  beforeLoad: ({ context, search, location }) => {
    if (!search.plan) throw redirect({ to: "/pricing", search: { courseSlug: search.courseSlug } })
    if (!context.account) throw redirect({ to: "/login", search: { next: location.href } })
    if (context.hasActiveSubscription) throw redirect({ to: "/settings" })
    return { checkoutPlan: search.plan }
  },
  loaderDeps: ({ search }) => ({ plan: search.plan, courseSlug: search.courseSlug }),
  loader: async ({ context, deps, preload }) => {
    // Hovering or prefetching a link must never create a Stripe session.
    if (preload) return { error: undefined }

    let result
    try {
      result = await submitCheckoutSession({
        data: { interval: context.checkoutPlan, courseSlug: deps.courseSlug },
      })
    } catch (error) {
      return { error: toSubmitErrorMessage(error, "Could not open checkout. Please try again.") }
    }

    if ("error" in result) return result
    throw redirect({ href: result.url, reloadDocument: true })
  },
  preloadStaleTime: 0,
  gcTime: 0,
  pendingMs: 0,
  pendingMinMs: 0,
  pendingComponent: SubscribePagePending,
  component: SubscribePage,
})

function SubscribePage() {
  const { account } = Route.useRouteContext()
  const { error } = Route.useLoaderData()
  const { courseSlug } = Route.useSearch()
  const router = useRouter()
  const isLoading = useRouterState({ select: (state) => state.isLoading })

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      <Navbar account={account} />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-4 px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">We couldn’t open checkout</h1>
        <p role="alert" className="text-muted-foreground">
          {error ?? "Please try again to continue with your selected plan."}
        </p>
        <div className="flex gap-3 pt-2">
          <Button onClick={() => void router.invalidate()} disabled={isLoading}>
            {isLoading ? "Opening checkout..." : "Try again"}
          </Button>
          <Button
            render={
              <Link to="/pricing" search={{ courseSlug }}>
                View plans
              </Link>
            }
            nativeButton={false}
            variant="outline"
          />
        </div>
      </main>
    </div>
  )
}

function SubscribePagePending() {
  const { account } = Route.useRouteContext()

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      <Navbar account={account} />
      <main
        aria-label="Opening checkout"
        aria-busy="true"
        className="mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-4 px-4 py-16"
      >
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-6 w-full" />
        <div className="flex gap-3 pt-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </main>
    </div>
  )
}
