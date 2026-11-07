import { createFileRoute, redirect } from "@tanstack/react-router"

import { Navbar } from "@/components/navbar"
import { Skeleton } from "@/components/ui/skeleton"
import { ROBOTS_NOINDEX_META } from "@/lib/config"
import { useSiteConfig } from "@/lib/hooks"

import { DeleteAccountDialog } from "./-components/delete-account-dialog"
import { ProfileSettingsForm } from "./-components/profile-settings-form"
import { SubscriptionSettings } from "./-components/subscription-settings"
import { loadSubscriptionSettings } from "./-functions/load-subscription-settings"

export const Route = createFileRoute("/(billing)/settings/")({
  head: () => ({ meta: [ROBOTS_NOINDEX_META] }),
  beforeLoad: ({ context, location }) => {
    if (!context.account) {
      throw redirect({ to: "/login", search: { next: location.href } })
    }
    return { account: context.account }
  },
  // Profile settings have nothing to do with billing, so the page stays and only this section goes.
  loader: ({ context }) =>
    context.siteConfig.integrations.billing.enabled ? loadSubscriptionSettings() : null,
  pendingComponent: SettingsPagePending,
  component: SettingsPage,
})

function SettingsPage() {
  const { account } = Route.useRouteContext()
  const subscription = Route.useLoaderData()

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      <Navbar account={account} />
      <main className="mx-auto w-full max-w-sm flex-1 space-y-6 px-4 py-8">
        <h1 className="text-xl font-semibold">Settings</h1>
        <ProfileSettingsForm account={account} />
        {subscription && <SubscriptionSettings {...subscription} />}
        <section className="flex flex-col items-start gap-3">
          <h2 className="text-sm font-medium">Delete account</h2>
          <p className="text-sm text-muted-foreground">
            Permanently delete your account and learning data. This can't be undone.
          </p>
          <DeleteAccountDialog account={account} />
        </section>
      </main>
    </div>
  )
}

function SettingsPagePending() {
  const { account } = Route.useRouteContext()
  const { integrations } = useSiteConfig()

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      <Navbar account={account} />
      <main className="mx-auto w-full max-w-sm flex-1 space-y-6 px-4 py-8">
        <h1 className="text-xl font-semibold">Settings</h1>
        <ProfileSettingsForm account={account} />
        {integrations.billing.enabled && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium">Subscription</h2>
            <Skeleton className="h-5 w-64" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </section>
        )}
      </main>
    </div>
  )
}
