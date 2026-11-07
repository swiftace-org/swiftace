// The swiftace binary's command line. Its default command, start, runs the server; the others set
// up and maintain a server it runs on. Each command's module is imported when it's run, so the
// others don't load the app.
import { parseArgs, type ParseArgsConfig } from "node:util"

import { DEFAULT_PORT, DEFAULT_PREVIEW_PORT } from "./environment.ts"
import { CommandError, VERSION } from "./shell.ts"

const HELP = `SwiftAce ${VERSION}, an open-source course platform

Usage: swiftace [command]

Commands:
  start                 Start the server (the default)
  migrate [--dry-run]   Apply the database migrations that haven't run yet, or list them
  configure-integrations <file.json>
                        Save integration settings from a local JSON file, including initial SES setup
  make-admin <email>    Make an existing account an admin
  upgrade [version] [-y]
                        Replace this binary with the latest release, or the given one
  deploy <domain> [redirect-domains...] [--preview-domain <domain>]
                        Install SwiftAce on this server as a service behind Caddy (as root)
  version               Print the version
  help                  Print this

The server is configured with environment variables (it never reads a .env file):
  DATABASE_URL          Postgres, e.g. postgres://user:password@localhost:5432/swiftace
  JWT_SECRET_KEY, HASH_SECRET_KEY
                        Long random strings, e.g. from \`openssl rand -hex 32\`
  PORT                  The app's port (${DEFAULT_PORT})
  PREVIEW_PORT          The notebook preview's port (${DEFAULT_PREVIEW_PORT}), or 0 to turn it off
  PREVIEW_ALLOWED_PARENT_ORIGINS
                        The origins that may embed the preview, e.g. https://example.com
  HOST                  The address both listen on (all of them)

Everything else is set by an admin at /manage/config.`

type Command = {
  options?: ParseArgsConfig["options"]
  run: (positionals: string[], values: ReturnType<typeof parseArgs>["values"]) => Promise<void>
}

const COMMANDS: Record<string, Command> = {
  start: { run: async () => (await import("./start.ts")).start() },
  migrate: {
    options: { "dry-run": { type: "boolean" } },
    run: async (_, values) => (await import("./migrate.ts")).migrate(Boolean(values["dry-run"])),
  },
  "make-admin": {
    run: async ([email]) => (await import("./make-admin.ts")).makeAdmin(email),
  },
  "configure-integrations": {
    run: async ([path]) =>
      (await import("./configure-integrations.ts")).configureIntegrations(path),
  },
  upgrade: {
    options: { yes: { type: "boolean", short: "y" } },
    run: async ([version], values) =>
      (await import("./upgrade.ts")).upgrade(version, Boolean(values.yes)),
  },
  deploy: {
    options: { "preview-domain": { type: "string" } },
    run: async (domains, values) =>
      (await import("./deploy.ts")).deploy(domains, values["preview-domain"] as string | undefined),
  },
}

async function main(argv: string[]) {
  const [name = "start", ...rest] = argv
  if (["help", "--help", "-h"].includes(name)) return console.log(HELP)
  // The version alone, for scripts.
  if (["version", "--version", "-v"].includes(name)) return console.log(VERSION)
  const command = COMMANDS[name]
  if (!command) throw new CommandError(`Unknown command: ${name}. See swiftace help.`)
  if (rest.includes("--help") || rest.includes("-h")) return console.log(HELP)
  let parsed
  try {
    parsed = parseArgs({ args: rest, options: command.options ?? {}, allowPositionals: true })
  } catch (error) {
    throw new CommandError(`${(error as Error).message}. See swiftace help.`)
  }
  await command.run(parsed.positionals, parsed.values)
}

main(process.argv.slice(2)).catch((error: unknown) => {
  // Expected failures are printed with their message alone; anything else with its stack.
  console.error(error instanceof CommandError ? `Error: ${error.message}` : error)
  process.exit(1)
})
