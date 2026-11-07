import { Navbar } from "@/components/navbar"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { Account } from "@/types/account"

import { HomeFooter } from "./home-footer"
import { HomeHero } from "./home-hero"
import { HomeHeroHeader } from "./home-hero-header"

export function HomePagePending({ account }: { account: Account | null }) {
  const CoursesHeading = account ? "h1" : "h2"

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      {account ? <Navbar account={account} /> : <HomeHeroHeader />}
      <main className="flex flex-1 flex-col gap-10 px-6 py-8 sm:px-8">
        {!account && <HomeHero hasReviews />}
        <section
          id="courses"
          className="mx-auto w-full max-w-6xl scroll-mt-20 flex flex-col gap-y-4"
        >
          <CoursesHeading className="font-bold text-3xl">Courses</CoursesHeading>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Card key={i} className="overflow-hidden border-border/70 pb-6 pt-0 shadow-none">
                <Skeleton className="aspect-video w-full rounded-none" />
                <CardHeader className="space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
        {!account && (
          <section className="mx-auto flex w-full max-w-6xl flex-col gap-y-4">
            <h2 className="text-3xl font-bold">Reviews</h2>
            <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }, (_, i) => (
                <Card key={i} className="gap-4 p-5 shadow-none sm:p-6">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-11 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </div>
                  <Skeleton className="h-28 w-full" />
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>
      <HomeFooter />
    </div>
  )
}
