import { createHash } from "node:crypto"
// Runs a built binary as a server would, in an empty folder with no node_modules, against an empty
// Postgres database: migrate, start, pages and the files embedded in it, the notebook preview's
// headers, and a prompt shutdown. Then it upgrades a copy from pretend releases. CI runs it on
// every Linux binary it releases (test/integration.ts goes further, with a browser).
//
//   DATABASE_URL=postgres://… bun scripts/smoke-test.ts dist/swiftace
import { copyFile, mkdir, mkdtemp, readdir, rm, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"

import packageJson from "../package.json" with { type: "json" }

const binary = resolve(process.argv[2] ?? "dist/swiftace")
const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) throw new Error("Set DATABASE_URL to an empty Postgres database")
const PORT = Number(process.env.SMOKE_PORT ?? 4298)
const PREVIEW_PORT = PORT + 1
const base = `http://127.0.0.1:${PORT}`
const dir = await mkdtemp(join(tmpdir(), "swiftace-smoke-"))

const env: Record<string, string | undefined> = {
  ...process.env,
  DATABASE_URL,
  JWT_SECRET_KEY: "smoke-jwt-secret",
  HASH_SECRET_KEY: "smoke-hash-secret",
  AWS_ACCESS_KEY_ID: "smoke",
  AWS_ACCESS_KEY_SECRET: "smoke",
  AWS_REGION: "us-east-1",
  EMAIL_DOMAIN: "example.com",
  R2_ENDPOINT_URL: "http://127.0.0.1:9",
  R2_ACCESS_KEY_ID: "smoke",
  R2_SECRET_ACCESS_KEY: "smoke",
  R2_BUCKET: "smoke",
  NOTEBOOK_PREVIEW_URL: `http://127.0.0.1:${PREVIEW_PORT}`,
  HOST: "127.0.0.1",
  PORT: String(PORT),
  PREVIEW_PORT: String(PREVIEW_PORT),
  PREVIEW_ALLOWED_PARENT_ORIGINS: base,
}

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Smoke test failed: ${message}`)
  console.log(`ok - ${message}`)
}

/** Runs the binary to completion in the empty folder, with its output. */
function swiftace(args: string[], extraEnv: Record<string, string | undefined> = {}) {
  const result = Bun.spawnSync([binary, ...args], { cwd: dir, env: { ...env, ...extraEnv } })
  return {
    code: result.exitCode,
    output: `${result.stdout.toString()}${result.stderr.toString()}`.trim(),
  }
}

try {
  const version = swiftace(["version"]).output
  check(version === packageJson.version, `swiftace version prints ${version}`)
  check(/migrate \[--dry-run\]/.test(swiftace(["help"]).output), "swiftace help lists the commands")

  const dryRun = swiftace(["migrate", "--dry-run"])
  check(dryRun.code === 0 && /0000_baseline/.test(dryRun.output), "migrate --dry-run lists them")
  // Nothing beside the binary is read, neither a .env nor a bunfig.toml.
  await writeFile(join(dir, ".env"), "JWT_SECRET_KEY=from-dotenv\n")
  await writeFile(join(dir, "bunfig.toml"), 'preload = ["./preload.ts"]\n')
  await writeFile(join(dir, "preload.ts"), 'console.log("bunfig was read")\n')
  const ignored = swiftace(["start"], { JWT_SECRET_KEY: undefined })
  check(
    /Set JWT_SECRET_KEY/.test(ignored.output) && !/bunfig was read/.test(ignored.output),
    "it reads neither .env nor bunfig.toml",
  )
  const migrated = swiftace(["migrate"])
  check(migrated.code === 0 && /Applied/.test(migrated.output), "migrate applies them")
  check(/no migrations/.test(swiftace(["migrate"]).output), "migrate again has nothing to do")

  const notRoot = swiftace(["deploy", "example.com"])
  check(
    process.getuid?.() === 0 || (notRoot.code === 1 && /as root/.test(notRoot.output)),
    "deploy refuses to run without root",
  )
  const noOrigins = swiftace(["start"], { PREVIEW_ALLOWED_PARENT_ORIGINS: "" })
  check(
    noOrigins.code === 1 && /PREVIEW_ALLOWED_PARENT_ORIGINS/.test(noOrigins.output),
    "start refuses a preview nothing may embed",
  )

  const server = Bun.spawn([binary, "start"], {
    cwd: dir,
    env,
    stdout: "inherit",
    stderr: "inherit",
  })
  try {
    for (let i = 0; !(await fetch(`${base}/status`).catch(() => null))?.ok; i++) {
      if (i > 300) throw new Error("The server didn't start")
      await Bun.sleep(100)
    }
    const home = await fetch(base)
    const html = await home.text()
    check(home.ok && html.includes("<title>"), "the home page is rendered")
    const script = /src="(\/assets\/[^"]+\.js)"/.exec(html)?.[1]
    const style = /href="(\/assets\/[^"]+\.css)"/.exec(html)?.[1]
    check(script && (await fetch(base + script)).ok, `its script is served: ${script}`)
    check(style && (await fetch(base + style)).ok, `its stylesheet is served: ${style}`)
    check((await fetch(`${base}/login`)).ok, "the login page is rendered")
    const font = await fetch(`${base}/fonts/Inter-Regular.ttf`)
    check(font.ok && (await font.arrayBuffer()).byteLength > 100_000, "public/ files are served")
    const icon = await fetch(`${base}/icon-192.png`)
    check(icon.headers.get("content-type") === "image/png", "the icon is resized by Jimp")
    check((await fetch(`${base}/nowhere`)).status === 404, "a missing page is a 404")

    const preview = await fetch(`http://127.0.0.1:${PREVIEW_PORT}/`)
    const page = await preview.text()
    check(
      preview.headers.get("content-security-policy") ===
        `sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox; frame-ancestors ${base}`,
      "the notebook preview sets the sandbox policy",
    )
    check(
      preview.headers.get("referrer-policy") === "no-referrer" &&
        preview.headers.get("x-content-type-options") === "nosniff" &&
        !preview.headers.has("set-cookie"),
      "and its other headers, without a cookie",
    )
    check(page.includes(`const allowedDomains = ${JSON.stringify([base])}`), "and the origins")
    const post = await fetch(`http://127.0.0.1:${PREVIEW_PORT}/`, { method: "POST" })
    check(post.status === 405, "and refuses a POST")
  } finally {
    const stopping = performance.now()
    server.kill("SIGTERM")
    await server.exited
    check(performance.now() - stopping < 5000, "it stops promptly on SIGTERM")
  }
  await upgrade()
} finally {
  await rm(dir, { recursive: true, force: true })
}
console.log("All good")

/** Upgrades a copy of the binary from pretend releases, each of which is this binary. */
async function upgrade() {
  const asset = `swiftace-${process.platform}-${process.arch}`
  const bytes = await Bun.file(binary).bytes()
  const hash = createHash("sha256").update(bytes).digest("hex")
  // 99.0.1's SHA256SUMS has the wrong hash.
  const releases = new Map([
    [packageJson.version, hash],
    ["99.0.0", hash],
    ["99.0.1", "0".repeat(64)],
  ])
  let latest = packageJson.version
  const server = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    fetch(request) {
      const url = new URL(request.url)
      if (url.pathname === "/releases/latest") {
        return Response.redirect(new URL(`/releases/tag/v${latest}`, url), 302)
      }
      const [, version, file] = /^\/releases\/download\/v([^/]+)\/(.+)$/.exec(url.pathname) ?? []
      const sum = releases.get(version ?? "")
      if (sum && file === "SHA256SUMS") return new Response(`${sum}  ${asset}\n`)
      if (sum && file === asset) return new Response(bytes)
      return new Response("Not found", { status: 404 })
    },
  })
  try {
    const copy = join(dir, "bin", "swiftace")
    await mkdir(dirname(copy))
    await copyFile(binary, copy)
    const inode = (await stat(copy)).ino
    // Asynchronously, so the pretend releases in this process can answer it.
    const run = async (...args: string[]) => {
      const child = Bun.spawn([copy, ...args], {
        cwd: dir,
        env: { ...process.env, SWIFTACE_RELEASES_URL: `${server.url}releases` },
        stdout: "pipe",
        stderr: "pipe",
      })
      const output =
        (await new Response(child.stdout).text()) + (await new Response(child.stderr).text())
      return { code: await child.exited, output }
    }
    check(/is up to date/.test((await run("upgrade")).output), "upgrade says it's up to date")
    check(
      /is older than/.test((await run("upgrade", "0.0.1", "-y")).output),
      "upgrade refuses an older version",
    )
    check(
      /doesn't match 99\.0\.1's SHA256SUMS/.test((await run("upgrade", "v99.0.1", "--yes")).output),
      "upgrade refuses a bad checksum",
    )
    check(
      /HTTP 404/.test((await run("upgrade", "99.0.2", "-y")).output),
      "upgrade says a version is missing",
    )
    check((await stat(copy)).ino === inode, "a failed upgrade leaves the binary alone")
    latest = "99.0.0"
    const upgraded = await run("upgrade", "-y")
    check(
      upgraded.code === 0 &&
        upgraded.output.includes(`Upgraded SwiftAce ${packageJson.version} to 99.0.0`),
      "upgrade replaces the binary with the latest release",
    )
    check((await stat(copy)).ino !== inode, "the binary was replaced")
    check((await readdir(dirname(copy))).length === 1, "the upgrade left no files behind")
  } finally {
    await server.stop(true)
  }
}
