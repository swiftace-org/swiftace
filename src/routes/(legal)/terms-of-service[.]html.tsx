import { createFileRoute } from "@tanstack/react-router"

import { toPageHead } from "@/lib/utils"

import { LegalPage, LegalPagePending } from "./-components/legal-page"
import { loadLegalDocument } from "./-functions/load-legal-document"

export const Route = createFileRoute("/(legal)/terms-of-service.html")({
  loader: () => loadLegalDocument({ data: { document: "termsOfService" } }),
  head: ({ match }) =>
    toPageHead(match.context.siteConfig, {
      title: "Terms of Service",
      description: `The terms that govern your use of ${match.context.siteConfig.general.siteName}'s courses, subscriptions and website.`,
      path: "/terms-of-service.html",
    }),
  pendingComponent: TermsOfServicePagePending,
  component: TermsOfServicePage,
})

function TermsOfServicePage() {
  const { account } = Route.useRouteContext()
  const { markup } = Route.useLoaderData()
  return <LegalPage account={account} markup={markup} />
}

function TermsOfServicePagePending() {
  const { account } = Route.useRouteContext()
  return <LegalPagePending account={account} />
}
