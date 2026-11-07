import { createFileRoute, redirect } from "@tanstack/react-router"

import { BlueLink } from "@/components/blue-link"
import { Navbar } from "@/components/navbar"
import { Skeleton } from "@/components/ui/skeleton"
import { ROBOTS_NOINDEX_META } from "@/lib/config"

import { CertificateListItem } from "./-components/certificate-list-item"
import { ProfileHeader } from "./-components/profile-header"
import { loadProfilePageData } from "./-functions/load-profile-page-data"

export const Route = createFileRoute("/profile/")({
  head: () => ({ meta: [ROBOTS_NOINDEX_META] }),
  beforeLoad: ({ context, location }) => {
    if (!context.account) {
      throw redirect({ to: "/login", search: { next: location.href } })
    }
    return { account: context.account }
  },
  loader: async () => loadProfilePageData(),
  pendingComponent: ProfilePagePending,
  component: ProfilePage,
})

function ProfilePage() {
  const { certificates } = Route.useLoaderData()
  const { account } = Route.useRouteContext()

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      <Navbar account={account} />
      <main className="mx-auto w-full max-w-2xl flex-1 space-y-8 px-4 py-8">
        <ProfileHeader account={account} />

        <div className="space-y-4">
          <h2 className="text-lg font-medium">Certificates</h2>
          {certificates.length > 0 ? (
            <ul className="space-y-3">
              {certificates.map((certificate) => (
                <CertificateListItem key={certificate.id} certificate={certificate} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              You haven&apos;t earned any certificates yet.{" "}
              <BlueLink to="/" colored>
                Browse courses
              </BlueLink>
              .
            </p>
          )}
        </div>
      </main>
    </div>
  )
}

function ProfilePagePending() {
  const { account } = Route.useRouteContext()

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      <Navbar account={account} />
      <main className="mx-auto w-full max-w-2xl flex-1 space-y-8 px-4 py-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>

        <div className="space-y-4">
          <Skeleton className="h-5 w-28" />
          <ul className="space-y-3">
            {Array.from({ length: 3 }, (_, i) => (
              <li key={i} className="flex items-center gap-4 rounded-lg border p-3">
                <Skeleton className="h-12 w-20 shrink-0 rounded-md" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-8 w-14 rounded-md" />
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  )
}
