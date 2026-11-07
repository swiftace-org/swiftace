import { createFileRoute } from "@tanstack/react-router"

/** Polled by the uptime monitor, so it answers without touching the session or the database. */
export const Route = createFileRoute("/status")({
  server: {
    handlers: {
      GET: () => Response.json({ status: "ok" }),
    },
  },
})
