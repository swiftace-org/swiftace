import { Link } from "@tanstack/react-router"
import { Fragment, useRef } from "react"

import { Button } from "@/components/ui/button"
import { useSiteConfig } from "@/lib/hooks"
import { cn } from "@/lib/utils"

import { HomeHeroBackground } from "./home-hero-background"

/** Below `lg` the stats sit in one row under the headline, a column each. */
const STAT_COLUMNS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
}

/** `hasReviews` decides the second button, which would otherwise scroll to nothing. */
export function HomeHero({ hasReviews }: { hasReviews: boolean }) {
  const heroRef = useRef<HTMLElement>(null)
  const { home, integrations } = useSiteConfig()
  const headlineLines = home.headline.split("\n")

  // Reaches past main's padding and under the sticky header so the dots fill the top of the page.
  return (
    <section
      ref={heroRef}
      aria-labelledby="home-hero-heading"
      className="relative isolate -mx-6 -mt-22 px-6 pt-14 sm:-mx-8 sm:px-8"
    >
      <HomeHeroBackground heroRef={heroRef} />
      <div
        className={cn(
          "mx-auto grid w-full max-w-6xl items-center gap-12 py-12 sm:gap-16 sm:py-16 lg:gap-16",
          home.stats.length > 0 && "lg:grid-cols-[minmax(0,1fr)_20rem]",
        )}
      >
        <div>
          <h1
            id="home-hero-heading"
            className="text-balance text-center text-3xl font-bold leading-tight tracking-tight min-[375px]:text-4xl sm:text-5xl lg:text-left lg:text-6xl"
          >
            {headlineLines.map((line, index) => (
              <Fragment key={index}>
                {index > 0 && <br />}
                {line}
              </Fragment>
            ))}
          </h1>
          <p className="mx-auto mt-6 max-w-md text-balance text-center text-base leading-relaxed text-muted-foreground sm:text-xl lg:mx-0 lg:text-left">
            {home.subtitle}
          </p>
          <div className="mt-8 hidden gap-3 lg:flex">
            <Button
              className="h-11 px-5"
              size="lg"
              nativeButton={false}
              render={
                <Link
                  to="/login"
                  search={{ next: integrations.billing.enabled ? "/pricing" : undefined }}
                />
              }
            >
              Get Started
            </Button>
            {hasReviews && (
              <Button
                variant="outline"
                className="h-11 px-5"
                size="lg"
                nativeButton={false}
                render={<Link to="." hash="reviews" hashScrollIntoView={{ behavior: "smooth" }} />}
              >
                Read Reviews
              </Button>
            )}
          </div>
        </div>
        {home.stats.length > 0 && (
          <dl
            className={cn(
              "mx-auto grid w-full max-w-xs py-4 sm:max-w-sm lg:max-w-none lg:grid-cols-1 lg:px-8 lg:py-0",
              STAT_COLUMNS[home.stats.length],
            )}
          >
            {home.stats.map(({ value, label }) => (
              <div
                key={label}
                className="flex flex-col-reverse justify-end gap-2 px-2 text-center lg:px-0 lg:py-4"
              >
                <dt className="text-balance text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  {label}
                </dt>
                <dd className="text-xl font-semibold tracking-tight text-hero-accent min-[375px]:text-2xl sm:text-4xl lg:text-5xl">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  )
}
