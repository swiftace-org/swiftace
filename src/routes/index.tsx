import { createFileRoute } from "@tanstack/react-router"

import { toAbsoluteUrl, toPageHead } from "@/lib/utils"

import { HomePage } from "./-components/home-page"
import { HomePagePending } from "./-components/home-page-pending"
import { loadIndexPageData } from "./-functions/load-index-page-data"

export const Route = createFileRoute("/")({
  loader: async ({ context }) => loadIndexPageData({ data: { includeReviews: !context.account } }),
  head: ({ loaderData, match }) =>
    toPageHead(match.context.siteConfig, {
      title: match.context.siteConfig.general.tagline,
      description: match.context.siteConfig.general.description,
      path: "/",
      // The summary page Google's course carousel reads; each course page carries its `Course`.
      jsonLd: loaderData
        ? [
            {
              "@type": "ItemList",
              itemListElement: loaderData.courses.map((course, index) => ({
                "@type": "ListItem",
                position: index + 1,
                url: toAbsoluteUrl(`/course/${course.slug}`),
              })),
            },
          ]
        : [],
    }),
  pendingComponent: IndexPagePending,
  component: IndexPage,
})

function IndexPage() {
  const { courses, lessonCounts, assignmentCounts, reviews } = Route.useLoaderData()
  const { account } = Route.useRouteContext()
  return (
    <HomePage
      account={account}
      courses={courses}
      lessonCounts={lessonCounts}
      assignmentCounts={assignmentCounts}
      reviews={reviews}
    />
  )
}

function IndexPagePending() {
  const { account } = Route.useRouteContext()
  return <HomePagePending account={account} />
}
