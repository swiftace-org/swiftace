import { Link, createFileRoute, redirect } from "@tanstack/react-router"

import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ROBOTS_NOINDEX_META } from "@/lib/config"

import { loadCheckoutCompletion } from "./-functions/load-checkout-completion"

/**
 * Where Stripe sends the browser after checkout. Nothing renders in the happy path: the loader
 * confirms the subscription and redirects on. The component only covers a checkout still pending.
 */
export const Route = createFileRoute("/(billing)/pricing/complete")({
  head: () => ({ meta: [ROBOTS_NOINDEX_META] }),
  validateSearch: (search: { session_id?: string }): { session_id?: string } => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  beforeLoad: ({ context, location }) => {
    if (!context.account) throw redirect({ to: "/login", search: { next: location.href } })
  },
  loaderDeps: ({ search }) => ({ sessionId: search.session_id }),
  loader: async ({ deps }) => {
    if (!deps.sessionId) throw redirect({ to: "/pricing" })

    const result = await loadCheckoutCompletion({ data: { sessionId: deps.sessionId } })
    if (!result.isSubscribed) return result

    throw redirect(
      result.courseSlug
        ? { to: "/course/$courseSlug", params: { courseSlug: result.courseSlug } }
        : { to: "/" },
    )
  },
  pendingComponent: CheckoutCompletePending,
  component: CheckoutCompletePage,
})

function CheckoutCompletePage() {
  const { account } = Route.useRouteContext()

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      <Navbar account={account} />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-4 px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">We're still confirming your payment</h1>
        <p className="text-muted-foreground">
          Stripe hasn't finished processing your subscription yet. This usually takes a few seconds
          — reload this page, or head to a course and enroll once it goes through.
        </p>
        <div className="flex gap-3 pt-2">
          <Button render={<Link to="/">Browse courses</Link>} nativeButton={false} />
          <Button
            render={<Link to="/settings">Check settings</Link>}
            nativeButton={false}
            variant="outline"
          />
        </div>
      </main>
    </div>
  )
}

function CheckoutCompletePending() {
  const { account } = Route.useRouteContext()

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      <Navbar account={account} />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-4 px-4 py-16">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-4/5" />
        <div className="flex gap-3 pt-2">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-36" />
        </div>
      </main>
    </div>
  )
}
