import { createFileRoute } from "@tanstack/react-router"

import { toPageHead } from "@/lib/utils"

import { LegalPage, LegalPagePending } from "./-components/legal-page"
import { loadLegalDocument } from "./-functions/load-legal-document"

export const Route = createFileRoute("/(legal)/privacy-policy.html")({
  loader: () => loadLegalDocument({ data: { document: "privacyPolicy" } }),
  head: ({ match }) =>
    toPageHead(match.context.siteConfig, {
      title: "Privacy Policy",
      description: `How ${match.context.siteConfig.general.siteName} collects, uses and protects your personal information when you use our courses and website.`,
      path: "/privacy-policy.html",
    }),
  pendingComponent: PrivacyPolicyPagePending,
  component: PrivacyPolicyPage,
})

function PrivacyPolicyPage() {
  const { account } = Route.useRouteContext()
  const { markup } = Route.useLoaderData()
  return <LegalPage account={account} markup={markup} />
}

function PrivacyPolicyPagePending() {
  const { account } = Route.useRouteContext()
  return <LegalPagePending account={account} />
}
