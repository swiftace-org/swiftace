import {
  Body,
  Container,
  Head,
  Html,
  Img,
  pixelBasedPreset,
  Preview,
  Section,
  Tailwind,
} from "@react-email/components"
import type { ReactNode } from "react"

import type { EmailBrand } from "@/types/site-config"

/**
 * The shell every transactional email shares: a single bordered card with the logo on top.
 * Email clients ignore most modern CSS, so the layout stays a fixed-width centred block and
 * every colour is spelled out rather than pulled from the app's design tokens.
 */
export function EmailLayout({
  brand,
  preview,
  children,
}: {
  brand: EmailBrand
  preview: string
  children: ReactNode
}) {
  return (
    <Html>
      <Head />
      <Tailwind config={{ presets: [pixelBasedPreset] }}>
        <Body className="bg-white font-sans text-gray-900">
          <Preview>{preview}</Preview>
          <Container className="px-4">
            <Section className="w-md max-w-md border border-gray-200 my-8 p-4">
              <Img
                src={brand.logoUrl}
                width="56"
                height="56"
                alt={`${brand.siteName} logo`}
                className="mx-auto block my-6"
              />
              {children}
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}
