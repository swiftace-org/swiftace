import { Link, createFileRoute } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useSiteConfig } from "@/lib/hooks"
import { toPageHead } from "@/lib/utils"

import { PricingPageLayout } from "./-components/pricing-page-layout"
import { PricingPlanAction } from "./-components/pricing-plan-action"
import { PricingPlanCard } from "./-components/pricing-plan-card"
import { loadPricingPageData } from "./-functions/load-pricing-page-data"
import { calculateYearlySavingsPercent } from "./-lib/utils"

export const Route = createFileRoute("/(billing)/pricing/")({
  // Carry the course through checkout so the return trip can finish the intended enrollment.
  validateSearch: (search: { courseSlug?: string }): { courseSlug?: string } => ({
    courseSlug: typeof search.courseSlug === "string" ? search.courseSlug : undefined,
  }),
  loader: () => loadPricingPageData(),
  head: ({ match }) => {
    const { pricing } = match.context.siteConfig
    return toPageHead(match.context.siteConfig, {
      title: "Pricing",
      description: pricing.trialEnabled
        ? `${pricing.subtitle} Try it free for ${pricing.trialDays} days.`
        : pricing.subtitle,
      path: "/pricing",
    })
  },
  pendingComponent: PricingPagePending,
  component: PricingPage,
})

function PricingPage() {
  const { freePlan, monthlyPlan, yearlyPlan, isSubscribed, currentInterval, trialEligible } =
    Route.useLoaderData()
  const { account } = Route.useRouteContext()
  const { courseSlug } = Route.useSearch()
  const { pricing } = useSiteConfig()

  const savingsPercent = calculateYearlySavingsPercent(monthlyPlan, yearlyPlan)
  const proActionNote = trialEligible
    ? `${pricing.trialDays} days free · Card required`
    : "Manage or cancel in your account"

  return (
    <PricingPageLayout account={account}>
      <section aria-label="Compare plans" className="flex flex-col gap-6">
        <div className="mx-auto grid w-full max-w-md grid-cols-1 items-stretch gap-6 lg:max-w-none lg:grid-cols-3">
          <PricingPlanCard
            plan={freePlan}
            isCurrentPlan={!!account && !isSubscribed}
            actionNote="No credit card needed"
            action={
              <Button
                className="h-11 w-full"
                render={<Link to="/">{account ? "Browse courses" : "Get Started"}</Link>}
                nativeButton={false}
                variant="outline"
              />
            }
          />
          <PricingPlanCard
            plan={yearlyPlan}
            highlighted={!isSubscribed || currentInterval === "year"}
            isCurrentPlan={currentInterval === "year"}
            badge={savingsPercent != null ? `Save ${savingsPercent}%` : "Best value"}
            actionNote={proActionNote}
            action={
              <PricingPlanAction
                account={account}
                interval="year"
                currentInterval={currentInterval}
                isSubscribed={isSubscribed}
                trialEligible={trialEligible}
                highlighted
                courseSlug={courseSlug}
              />
            }
          />
          <PricingPlanCard
            plan={monthlyPlan}
            highlighted={currentInterval === "month"}
            isCurrentPlan={currentInterval === "month"}
            actionNote={proActionNote}
            action={
              <PricingPlanAction
                account={account}
                interval="month"
                currentInterval={currentInterval}
                isSubscribed={isSubscribed}
                trialEligible={trialEligible}
                highlighted={false}
                courseSlug={courseSlug}
              />
            }
          />
        </div>
      </section>
    </PricingPageLayout>
  )
}

function PricingPagePending() {
  const { account } = Route.useRouteContext()

  return (
    <PricingPageLayout account={account}>
      <section aria-label="Loading plans" className="flex flex-col gap-6">
        <div className="mx-auto grid w-full max-w-md grid-cols-1 items-stretch gap-6 lg:max-w-none lg:grid-cols-3">
          {[3, 5, 5].map((benefitCount, index) => (
            <Card
              key={index}
              className="flex w-full flex-col gap-6 rounded-2xl py-7 shadow-none ring-border"
            >
              <CardHeader className="flex flex-col gap-3">
                <Skeleton className="h-7 w-32" />
                <Skeleton className="h-10 w-full" />
                <div className="pt-2">
                  <Skeleton className="h-12 w-36" />
                  <Skeleton className="mt-2 h-5 w-36" />
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-6">
                <div className="flex flex-col items-center gap-3">
                  <Skeleton className="h-11 w-full" />
                  <Skeleton className="h-4 w-40" />
                </div>
                <div className="border-t border-border/60 pt-6">
                  <Skeleton className="mb-4 h-5 w-40" />
                  <div className="flex flex-col gap-3.5">
                    {Array.from({ length: benefitCount }, (_, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <Skeleton className="mt-0.5 size-4 shrink-0" />
                        <Skeleton className="h-5 w-full" />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </PricingPageLayout>
  )
}
