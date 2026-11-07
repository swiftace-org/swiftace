import { useState } from "react"

import { BlueLink } from "@/components/blue-link"
import { useSiteConfig } from "@/lib/hooks"

export function HomeFooter() {
  const [year] = useState(() => new Date().getFullYear())
  const { general, integrations } = useSiteConfig()

  return (
    <footer className="px-6 py-8 sm:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 border-t border-border/60 pt-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <nav
          aria-label="Footer"
          className="grid w-full grid-cols-2 items-start gap-x-4 gap-y-3 sm:flex sm:w-auto sm:flex-wrap sm:gap-x-6"
        >
          <BlueLink to="/">Home</BlueLink>
          <BlueLink to="/terms-of-service.html">Terms of Service</BlueLink>
          <BlueLink to="/privacy-policy.html">Privacy Policy</BlueLink>
          {integrations.billing.enabled && <BlueLink to="/pricing">Pricing</BlueLink>}
          <BlueLink external href={`mailto:${general.supportEmail}`}>
            Contact
          </BlueLink>
          {general.socialLinks.map((link) => (
            <BlueLink key={link.url} external href={link.url}>
              {link.label}
            </BlueLink>
          ))}
        </nav>
        <p className="shrink-0 sm:-order-1">
          © {year} {general.companyName || general.siteName}
        </p>
      </div>
    </footer>
  )
}
