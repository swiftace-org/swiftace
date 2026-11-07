import { BlueLink } from "@/components/blue-link"
import { useSiteConfig } from "@/lib/hooks"

export function PricingFaq() {
  const { general, pricing } = useSiteConfig()

  return (
    <section
      aria-labelledby="pricing-faq-heading"
      className="border-t border-border/60 pt-10 sm:pt-12"
    >
      <div className="flex flex-col gap-8 lg:flex-row lg:gap-16">
        <div className="lg:w-64 lg:shrink-0">
          <h2 id="pricing-faq-heading" className="text-2xl font-semibold tracking-tight">
            A few things to know
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Get in touch with us at{" "}
            <BlueLink colored external href={`mailto:${general.supportEmail}`}>
              {general.supportEmail}
            </BlueLink>
          </p>
        </div>
        <div className="grid flex-1 gap-8 sm:grid-cols-2">
          {pricing.faq.map((item, index) => (
            // Two questions may read the same, and the list only changes with the config.
            <div key={index} className="space-y-2">
              <h3 className="font-semibold">{item.question}</h3>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {item.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
