// `swiftace deploy <domain> [redirect-domains…] [--preview-domain <d>]`: sets up a Linux server,
// as root, to run SwiftAce from this binary behind Caddy:
//
//   sudo swiftace deploy example.com www.example.com --preview-domain preview.example.com
//
// It installs the binary in /usr/local/bin, creates /etc/swiftace.env, installs swiftace.service,
// migrates the database, restarts the service and edits the existing Caddyfile. The domains are
// saved, so later runs can leave them out.

import { existsSync } from "node:fs"
import { chmod, copyFile, readFile, realpath, rename, rm, writeFile } from "node:fs/promises"
import { basename, dirname, join } from "node:path"

import { configureSites } from "./caddyfile.ts"
import { ensureEnvFile } from "./env-file.ts"
import { DEFAULT_PORT, DEFAULT_PREVIEW_PORT, missingVariables } from "./environment.ts"
import { applyMigrations, withDatabase } from "./migrations.ts"
import { BINARY_PATH, CADDYFILE, DOMAINS_FILE, ENV_FILE, SERVICE_FILE } from "./paths.ts"
import { CommandError, fail, IS_BINARY, run, VERSION } from "./shell.ts"

export type Domains = { domains: string[]; previewDomain?: string }

export async function deploy(args: string[], previewDomain: string | undefined) {
  const preflight = preflightProblem({
    platform: process.platform,
    isBinary: IS_BINARY,
    uid: process.getuid?.(),
  })
  if (preflight) fail(preflight)

  const saved = await savedDomains()
  const domains = chooseDomains(args, previewDomain, saved)
  const problem = domainsProblem(domains)
  if (problem) fail(problem)
  // Checked before anything's changed.
  await run("caddy", "version").catch(() =>
    fail("Caddy isn't installed: https://caddyserver.com/docs/install"),
  )
  if (!existsSync(CADDYFILE)) {
    fail(
      `There's no ${CADDYFILE} to add the site to. Install Caddy from its package, which makes one.`,
    )
  }

  const binary = await installBinary()

  const env = await ensureEnvFile(ENV_FILE, domains.previewDomain)
  await chmod(ENV_FILE, 0o600)
  if (env.created) console.log(`Created ${ENV_FILE}, with new JWT_SECRET_KEY and HASH_SECRET_KEY`)
  const ports = servicePorts(env.variables)
  if (!ports.ok) fail(ports.error)
  const missing = missingVariables(Object.fromEntries(env.variables))
  if (missing.length) {
    fail(`Fill in ${missing.join(", ")} in ${ENV_FILE}, then run swiftace deploy again`)
  }
  // Worked out and validated before anything restarts, so a config Caddy rejects stops here.
  const caddyfile = await planCaddyfile({
    domain: domains.domains[0]!,
    redirectDomains: domains.domains.slice(1),
    previewDomain: domains.previewDomain,
    port: ports.port,
    previewPort: ports.previewPort,
  })

  console.log(`Installing swiftace.service, which runs ${binary}...`)
  await writeFile(SERVICE_FILE, service({ binary, ...ports, domain: domains.domains[0]! }))
  await chmod(SERVICE_FILE, 0o644)
  await run("systemctl", "daemon-reload")
  await run("systemctl", "enable", "--quiet", "swiftace")

  // Before the restart, so a failed migration leaves the running server as it was.
  console.log("Migrating the database...")
  const applied = await withDatabase(env.variables.get("DATABASE_URL")!, applyMigrations)
  console.log(applied.length ? `Applied ${applied.join(", ")}` : "Nothing to apply")

  await run("systemctl", "restart", "swiftace")
  await healthCheck(ports.port, ports.previewPort)

  if (caddyfile) await applyCaddyfile(caddyfile)
  await writeFile(DOMAINS_FILE, `${JSON.stringify(domains)}\n`)
  console.log(`Done: SwiftAce ${VERSION} is at https://${domains.domains[0]}`)
}

/** The domains given, falling back to the last deploy's for those left out. */
export function chooseDomains(
  args: string[],
  previewDomain: string | undefined,
  saved: Domains | undefined,
): Domains {
  const domains = args.length ? args : (saved?.domains ?? [])
  const preview = previewDomain ?? saved?.previewDomain
  return { domains: domains.map((d) => d.toLowerCase()), previewDomain: preview?.toLowerCase() }
}

export function domainsProblem({ domains, previewDomain }: Domains): string | undefined {
  if (!domains.length) {
    return (
      "Give the site's domain, then any that should redirect to it, e.g. " +
      "swiftace deploy example.com www.example.com --preview-domain preview.example.com"
    )
  }
  const all = [...domains, ...(previewDomain ? [previewDomain] : [])]
  for (const domain of all) {
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(domain)) {
      return `Not a domain: ${domain}`
    }
  }
  if (new Set(all).size !== all.length) return "Each domain can only be given once"
}

/**
 * The ports the service listens on, from the env file or the defaults, which Caddy is pointed
 * at. HOST stays loopback, since Caddy is the only way in.
 */
export function servicePorts(
  env: ReadonlyMap<string, string>,
): { ok: true; port: number; previewPort: number } | { ok: false; error: string } {
  const host = env.get("HOST")
  if (host && host !== "127.0.0.1") {
    return { ok: false, error: `${ENV_FILE}: HOST must be 127.0.0.1 for the service behind Caddy` }
  }
  const ports: number[] = []
  for (const [name, fallback] of [
    ["PORT", DEFAULT_PORT],
    ["PREVIEW_PORT", DEFAULT_PREVIEW_PORT],
  ] as const) {
    const value = env.get(name) || String(fallback)
    if (!/^[1-9]\d{3,4}$/.test(value) || Number(value) > 65535) {
      return { ok: false, error: `${ENV_FILE}: ${name} must be a port from 1024 to 65535` }
    }
    ports.push(Number(value))
  }
  const [port, previewPort] = ports as [number, number]
  if (port === previewPort) return { ok: false, error: `${ENV_FILE}: PORT and PREVIEW_PORT match` }
  return { ok: true, port, previewPort }
}

/** Why deploy can't run here, checked before it looks at anything else. */
export function preflightProblem(context: {
  platform: string
  isBinary: boolean
  uid: number | undefined
}): string | undefined {
  if (context.platform !== "linux")
    return "deploy installs SwiftAce on a Linux server, with systemd"
  if (!context.isBinary) return "deploy makes a service of the built binary: run it from there"
  if (context.uid !== 0) return "Run it as root, e.g. with sudo"
}

export function service(options: {
  binary: string
  port: number
  previewPort: number
  domain: string
}): string {
  return `[Unit]
Description=SwiftAce
After=network-online.target
Wants=network-online.target

[Service]
Type=exec
# Installed by swiftace deploy.
ExecStart=${options.binary} start
DynamicUser=yes
UMask=0077
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
PrivateDevices=yes
ProtectKernelTunables=yes
ProtectKernelModules=yes
ProtectKernelLogs=yes
ProtectControlGroups=yes
ProtectClock=yes
ProtectHostname=yes
RestrictSUIDSGID=yes
RestrictRealtime=yes
RestrictNamespaces=yes
LockPersonality=yes
CapabilityBoundingSet=
AmbientCapabilities=
RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6
# Bun compiles JavaScript to machine code as it runs, so MemoryDenyWriteExecute stays off.
Environment=HOST=127.0.0.1
Environment=PORT=${options.port}
Environment=PREVIEW_PORT=${options.previewPort}
# The notebook preview only accepts code from, and can only be framed by, the site.
Environment=PREVIEW_ALLOWED_PARENT_ORIGINS=https://${options.domain}
# The database URL and secrets, readable only by root. Its values win over the ones above.
EnvironmentFile=${ENV_FILE}
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
`
}

async function savedDomains(): Promise<Domains | undefined> {
  if (!existsSync(DOMAINS_FILE)) return undefined
  try {
    const saved = JSON.parse(await readFile(DOMAINS_FILE, "utf8")) as Partial<Domains>
    if (Array.isArray(saved.domains)) return saved as Domains
  } catch {}
  fail(`${DOMAINS_FILE} isn't what swiftace deploy writes. Remove it and give the domains.`)
}

/** Copies this binary to /usr/local/bin, unless it's run from there, and returns where it is. */
async function installBinary(): Promise<string> {
  const source = await realpath(process.execPath)
  if (source === BINARY_PATH) return BINARY_PATH
  console.log(`Installing ${source} as ${BINARY_PATH}...`)
  // Copied beside it and moved into place, so a running server keeps its copy.
  const tmp = `${BINARY_PATH}.${process.pid}.tmp`
  try {
    await copyFile(source, tmp)
    await chmod(tmp, 0o755)
    await rename(tmp, BINARY_PATH)
  } finally {
    await rm(tmp, { force: true })
  }
  return BINARY_PATH
}

async function healthCheck(port: number, previewPort: number) {
  const checks = [
    { name: "The app", url: `http://127.0.0.1:${port}/status` },
    { name: "The notebook preview", url: `http://127.0.0.1:${previewPort}/` },
  ]
  for (const { name, url } of checks) {
    for (let attempt = 0; ; attempt++) {
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) }).catch(() => null)
      if (response?.ok) break
      if (attempt >= 60) {
        fail(`${name} didn't answer at ${url} after the restart. See: journalctl -u swiftace -n 50`)
      }
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }
  console.log(`The app is up on 127.0.0.1:${port}, and the notebook preview on ${previewPort}`)
}

/** The edited Caddyfile, checked by Caddy, or null when it needs no change. */
async function planCaddyfile(
  sites: Parameters<typeof configureSites>[1],
): Promise<{ existing: string; edited: string } | null> {
  console.log(`Checking ${CADDYFILE}...`)
  const existing = await readFile(CADDYFILE, "utf8")
  const result = configureSites(existing, sites)
  if (!result.ok) fail(`${CADDYFILE}: ${result.error}`)
  for (const change of result.changes) console.log(`  ${change}`)
  for (const warning of result.warnings) console.warn(`  Warning: ${warning}`)
  if (result.caddyfile === existing) {
    console.log("It's up to date")
    return null
  }
  await validateCaddyfile(CADDYFILE, result.caddyfile)
  return { existing, edited: result.caddyfile }
}

/**
 * Runs `caddy validate` on a candidate beside the live file rather than in a temporary folder:
 * Caddy resolves `import` relative to the file it's in, so elsewhere a relative import would fail
 * or a glob would match different files, checking a config other than the one reloaded.
 */
export async function validateCaddyfile(caddyfile: string, contents: string): Promise<void> {
  const candidate = join(dirname(caddyfile), `.${basename(caddyfile)}.swiftace-${process.pid}`)
  try {
    await writeFile(candidate, contents, { mode: 0o644 })
    await run("caddy", "validate", "--config", candidate, "--adapter", "caddyfile")
  } finally {
    await rm(candidate, { force: true })
  }
}

/** Replaces the live Caddyfile and reloads Caddy, putting the old one back if it won't take it. */
async function applyCaddyfile({ existing, edited }: { existing: string; edited: string }) {
  if ((await readFile(CADDYFILE, "utf8")) !== existing) {
    fail(`${CADDYFILE} changed while deploy ran, so it's left alone: run swiftace deploy again`)
  }
  console.log(`Updating ${CADDYFILE}...`)
  const backup = `${CADDYFILE}.bak`
  await writeFile(backup, existing)
  await writeFile(CADDYFILE, edited)
  try {
    await run("systemctl", "reload", "caddy")
  } catch (error) {
    await writeFile(CADDYFILE, existing)
    await run("systemctl", "reload", "caddy").catch(() => {})
    const message = error instanceof CommandError ? error.message : String(error)
    fail(`Caddy didn't take the new config, so the old one is back. ${message}`)
  }
  console.log(`The previous Caddyfile is in ${backup}`)
}
