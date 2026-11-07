import { createFileRoute, redirect } from "@tanstack/react-router"

/** The legacy app served certificates at `/verify/:slug` as well, and those links are out in the
 * wild — without this the root catch-all would bounce them to the legacy site as a profile. */
export const Route = createFileRoute("/verify/$certificateSlug")({
  beforeLoad: ({ location, params }) => {
    throw redirect({
      href: `/certificate/${encodeURIComponent(params.certificateSlug)}${location.searchStr}`,
      statusCode: 301,
    })
  },
})
