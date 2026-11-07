import { useRef, type ReactNode } from "react"

import { Navbar } from "@/components/navbar"
import { useSiteConfig } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import type { Account } from "@/types/account"

import { HomeFooter } from "../../../-components/home-footer"
import { HomeHeroBackground } from "../../../-components/home-hero-background"
import { HomeHeroHeader } from "../../../-components/home-hero-header"
import { PricingFaq } from "./pricing-faq"

export function PricingPageLayout({
  account,
  children,
}: {
  account: Account | null
  children: ReactNode
}) {
  const heroRef = useRef<HTMLElement>(null)
  const { pricing } = useSiteConfig()

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      {account ? <Navbar account={account} /> : <HomeHeroHeader />}
      <main className="flex flex-1 flex-col">
        <section
          ref={heroRef}
          aria-labelledby="pricing-heading"
          // Slides under the sticky header so the dots show through it.
          className={cn("relative isolate px-6 sm:px-8", !account && "-mt-14 pt-14")}
        >
          {!account && <HomeHeroBackground heroRef={heroRef} />}
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 pb-10 pt-12 text-center sm:pb-12 sm:pt-16">
            <p className="text-sm font-semibold text-hero-accent">{pricing.eyebrow}</p>
            <h1
              id="pricing-heading"
              className="text-balance text-4xl font-bold tracking-tight sm:text-5xl"
            >
              {pricing.headline}
            </h1>
            <p className="max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              {pricing.subtitle}
            </p>
          </div>
        </section>
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 pb-8 sm:gap-12 sm:px-8">
          {children}
          <PricingFaq />
        </div>
      </main>
      <HomeFooter />
    </div>
  )
}
