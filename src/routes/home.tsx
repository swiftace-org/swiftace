import { createFileRoute } from "@tanstack/react-router"

import { toPageHead } from "@/lib/utils"

import { HomePage } from "./-components/home-page"
import { HomePagePending } from "./-components/home-page-pending"
import { loadIndexPageData } from "./-functions/load-index-page-data"

/** The signed-out landing page for everyone, so signed-in users can still reach it from `/`. */
export const Route = createFileRoute("/home")({
  loader: async () => loadIndexPageData({ data: { includeReviews: true } }),
  // Canonical to `/`, so search engines treat this as a copy rather than a second home page.
  head: ({ match }) => {
    const { general } = match.context.siteConfig
    return toPageHead(match.context.siteConfig, {
      title: general.tagline,
      description: general.description,
      path: "/",
    })
  },
  pendingComponent: () => <HomePagePending account={null} />,
  component: HomeRoutePage,
})

function HomeRoutePage() {
  const { courses, lessonCounts, assignmentCounts, reviews } = Route.useLoaderData()
  return (
    <HomePage
      account={null}
      courses={courses}
      lessonCounts={lessonCounts}
      assignmentCounts={assignmentCounts}
      reviews={reviews}
    />
  )
}
