import { createFileRoute, notFound } from "@tanstack/react-router"

/** Every page under `/pricing` sells the plan, so all of them are gone while billing is off. */
export const Route = createFileRoute("/(billing)/pricing")({
  beforeLoad: ({ context }) => {
    if (!context.siteConfig.integrations.billing.enabled) throw notFound()
  },
})
