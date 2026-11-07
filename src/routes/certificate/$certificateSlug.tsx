import { createFileRoute, notFound } from "@tanstack/react-router"

import { CourseCard } from "@/components/course-card"
import { Navbar } from "@/components/navbar"
import { Skeleton } from "@/components/ui/skeleton"
import { ROBOTS_NOINDEX_META } from "@/lib/config"

import { loadCertificatePageData } from "./-functions/load-certificate-page-data"

export const Route = createFileRoute("/certificate/$certificateSlug")({
  component: CertificatePage,
  loader: async ({ params }) => {
    const data = await loadCertificatePageData({ data: params })
    if (!data) throw notFound()
    return data
  },
  pendingComponent: CertificatePagePending,
  head: ({ loaderData, match }) => {
    if (!loaderData) return {}
    const { siteName } = match.context.siteConfig.general

    const { certificate, imageUrl } = loaderData
    const ownerName = certificate.printedName ?? certificate.owner.name
    const title = `Certificate of Accomplishment - ${ownerName} - ${certificate.course.title} - ${siteName}`
    const description = `This Certificate of Accomplishment is awarded to ${ownerName} for successfully completing "${certificate.course.title}" offered by ${siteName}.`

    return {
      // Kept out of search because it names a person; the preview tags are for sharing it.
      meta: [
        { title },
        { name: "description", content: description },
        ROBOTS_NOINDEX_META,
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:image", content: imageUrl },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    }
  },
})

function CertificatePage() {
  const { certificate, pdfUrl, imageUrl } = Route.useLoaderData()
  const { account } = Route.useRouteContext()
  const ownerName = certificate.printedName ?? certificate.owner.name

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      <Navbar account={account} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
        <h1 className="text-center text-xl font-medium md:text-2xl">
          Certificate issued to {ownerName}
        </h1>

        <div className="relative hidden aspect-[5/4] w-full overflow-hidden rounded-lg border sm:block">
          <object data={pdfUrl} type="application/pdf" className="absolute inset-0 h-full w-full">
            <img
              src={imageUrl}
              alt="Certificate"
              className="absolute inset-0 h-full w-full object-contain"
            />
          </object>
        </div>
        <img src={imageUrl} alt="Certificate" className="w-full rounded-lg border sm:hidden" />

        <CourseCard course={certificate.course} />
      </main>
    </div>
  )
}

function CertificatePagePending() {
  const { account } = Route.useRouteContext()

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      <Navbar account={account} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
        <Skeleton className="mx-auto h-7 w-72" />
        <Skeleton className="aspect-[5/4] w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </main>
    </div>
  )
}
