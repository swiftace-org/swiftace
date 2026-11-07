// `swiftace start`, the default command: runs the app server on PORT and, in the same process,
// the notebook preview server on PREVIEW_PORT, both on HOST, once the database is up to date.

import { readPreviewPage } from "./embed.ts" with { type: "macro" }
import { DEFAULT_PORT, DEFAULT_PREVIEW_PORT, missingVariables, readPort } from "./environment.ts"
import { pendingMigrations, withDatabase } from "./migrations.ts"
import { parseParentOrigins, previewHandler } from "./preview.ts"
import { fail } from "./shell.ts"

export async function start() {
  const env = process.env
  const missing = missingVariables(env)
  if (missing.length) {
    fail(`Set ${missing.join(", ")} in the environment. See \`swiftace help\` for what each is.`)
  }
  const port = readPort(env, "PORT", DEFAULT_PORT)
  const previewPort = readPort(env, "PREVIEW_PORT", DEFAULT_PREVIEW_PORT, { allowZero: true })
  if (previewPort === port) fail(`PREVIEW_PORT and PORT are both ${port}`)
  const origins = previewPort ? parseParentOrigins(env.PREVIEW_ALLOWED_PARENT_ORIGINS) : []
  const host = env.HOST?.trim() || undefined

  const pending = await withDatabase(env.DATABASE_URL!, pendingMigrations)
  if (pending.length) {
    fail(
      `The database has migrations to apply first: ${pending.join(", ")}. ` +
        "Back it up, then run `swiftace migrate`.",
    )
  }

  // Nitro's server closes on a signal but leaves the process running, as the database pool and
  // the preview keep it alive, so both servers are stopped here and then the process exits.
  const servers: Bun.Server<unknown>[] = []
  const serve = Bun.serve
  Bun.serve = ((options: Parameters<typeof serve>[0]) => {
    const server = serve(options)
    servers.push(server)
    return server
  }) as typeof Bun.serve
  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.once(signal, async () => {
      await Promise.race([Promise.all(servers.map((server) => server.stop())), Bun.sleep(10_000)])
      process.exit(0)
    })
  }

  try {
    if (previewPort) {
      const server = Bun.serve({
        port: previewPort,
        hostname: host,
        fetch: previewHandler(readPreviewPage(), origins),
      })
      console.log(`Notebook preview listening on ${server.url} for ${origins.join(", ")}`)
    }

    // Nitro's server reads these when it's imported, and starts listening.
    env.NODE_ENV ||= "production"
    env.NITRO_PORT = String(port)
    if (host) env.NITRO_HOST = host
    else for (const name of ["NITRO_HOST", "HOST"]) delete env[name]
    await import("#server")
  } finally {
    Bun.serve = serve
  }
}
