import { createFileRoute, redirect } from "@tanstack/react-router"

import { sanitizeNextUrl } from "./-lib/utils"

export const Route = createFileRoute("/(auth)/signup")({
  validateSearch: (search: Record<string, unknown>): { next?: string } => ({
    next: sanitizeNextUrl(search.next),
  }),
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/login", search: { next: search.next } })
  },
})
