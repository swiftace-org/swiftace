import { Link, useLocation } from "@tanstack/react-router"
import { MenuIcon } from "lucide-react"
import { useEffect, useState } from "react"

import { BlueLink } from "@/components/blue-link"
import { ModeToggle } from "@/components/mode-toggle"
import { SiteLogo } from "@/components/site-logo"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSiteConfig } from "@/lib/hooks"
import { cn } from "@/lib/utils"

/** `h-14` is load-bearing: the heroes pull themselves up by exactly that much to sit under it. */
export function HomeHeroHeader() {
  const next = useLocation({ select: (location) => location.href })
  const pathname = useLocation({ select: (location) => location.pathname })
  // Pricing swaps its own link for one back home.
  const onPricing = pathname.startsWith("/pricing")
  // `/home` has the reviews too; from anywhere else (pricing), `/` is the page that does.
  const reviewsPage = pathname === "/home" ? "/home" : "/"
  const scrolled = useScrolled()
  const { general, integrations } = useSiteConfig()
  const showPricing = integrations.billing.enabled && !onPricing

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-transparent px-4 transition-colors sm:px-8",
        scrolled && "border-border bg-background/80 backdrop-blur",
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between">
        <Link aria-label={`${general.siteName} home`} className="flex items-center" to="/">
          <SiteLogo size="lg" />
        </Link>
        <div className="flex items-center gap-2 lg:gap-5">
          {onPricing && (
            <BlueLink className="hidden text-sm font-medium lg:inline-flex" to="/">
              Home
            </BlueLink>
          )}
          <BlueLink
            className="hidden text-sm font-medium lg:inline-flex"
            to={reviewsPage}
            hash="reviews"
            hashScrollIntoView={{ behavior: "smooth" }}
          >
            Reviews
          </BlueLink>
          {showPricing && (
            <BlueLink className="hidden text-sm font-medium lg:inline-flex" to="/pricing">
              Pricing
            </BlueLink>
          )}
          <BlueLink
            className="hidden text-sm font-medium lg:inline-flex"
            to="/login"
            search={{ next }}
          >
            Log In
          </BlueLink>
          <div className="flex items-center gap-2 lg:gap-2.5">
            {/* After Sign Up on mobile, so the primary action leads; before it from `lg`. */}
            <div className="order-1 flex lg:-order-1">
              <ModeToggle variant="outline" />
            </div>
            <Button
              render={
                <Link to="/login" search={{ next }}>
                  Sign Up
                </Link>
              }
              nativeButton={false}
              variant="default"
              size="sm"
            />
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="order-2 cursor-pointer text-muted-foreground lg:hidden"
                  >
                    <MenuIcon className="size-5" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-40">
                {onPricing && <DropdownMenuItem render={<Link to="/" />}>Home</DropdownMenuItem>}
                <DropdownMenuItem
                  render={
                    <Link
                      to={reviewsPage}
                      hash="reviews"
                      hashScrollIntoView={{ behavior: "smooth" }}
                    />
                  }
                >
                  Reviews
                </DropdownMenuItem>
                {showPricing && (
                  <DropdownMenuItem render={<Link to="/pricing" />}>Pricing</DropdownMenuItem>
                )}
                <DropdownMenuItem render={<Link to="/login" search={{ next }} />}>
                  Log In
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}

function useScrolled() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 0)
    update()
    window.addEventListener("scroll", update, { passive: true })
    return () => window.removeEventListener("scroll", update)
  }, [])

  return scrolled
}
