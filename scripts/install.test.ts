// Runs scripts/install.sh against a fake releases server, as `curl … | sh` would, installing into
// a temporary folder rather than /usr/local/bin.
import { spawn } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises"
import { createServer, type Server } from "node:http"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vite-plus/test"

const SCRIPT = resolve(import.meta.dirname, "install.sh")
const ASSET = `swiftace-${process.platform}-${process.arch}`
/** A stand-in binary: what matters is that it's the file the sums vouch for, and it runs. */
const BINARY = "#!/bin/sh\necho 9.9.9\n"

let server: Server
let base: string
let dir: string
/** The release files by URL path; a test can corrupt one. */
let files: Map<string, string>
const requested: string[] = []

beforeAll(async () => {
  server = createServer((request, response) => {
    requested.push(request.url!)
    const body = files.get(request.url!)
    response.writeHead(body === undefined ? 404 : 200).end(body)
  })
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done))
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}/releases`
})
afterAll(() => new Promise((done) => server.close(done)))

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "swiftace-install-"))
  requested.length = 0
  const sum = createHash("sha256").update(BINARY).digest("hex")
  const sums = `${sum}  ${ASSET}\n${"0".repeat(64)}  swiftace-other-x64\n`
  files = new Map()
  for (const release of ["/releases/latest/download", "/releases/download/v0.1.1"]) {
    files.set(`${release}/SHA256SUMS`, sums)
    files.set(`${release}/${ASSET}`, BINARY)
  }
  return () => rm(dir, { recursive: true, force: true })
})

/** Not spawnSync, which would block the fake server this process runs. */
function install(env: Record<string, string> = {}) {
  const child = spawn("sh", [SCRIPT], {
    cwd: dir,
    env: { PATH: process.env.PATH, SWIFTACE_RELEASES_URL: base, SWIFTACE_INSTALL_DIR: dir, ...env },
  })
  let stdout = ""
  let stderr = ""
  child.stdout.on("data", (chunk: Buffer) => (stdout += chunk))
  child.stderr.on("data", (chunk: Buffer) => (stderr += chunk))
  return new Promise<{ status: number | null; stdout: string; stderr: string }>((done) =>
    child.on("close", (status) => done({ status, stdout, stderr })),
  )
}

describe.skipIf(!["linux", "darwin"].includes(process.platform))("install.sh", () => {
  it("installs this machine's binary in SWIFTACE_INSTALL_DIR, checked against the sums", async () => {
    const result = await install()
    expect(result.stderr).not.toMatch(/swiftace install:/)
    expect(result.status).toBe(0)
    expect(result.stdout).toContain(`Installed SwiftAce 9.9.9 at ${dir}/swiftace`)
    expect(result.stdout).toContain(`${dir} isn't on your PATH`)
    expect(await readFile(join(dir, "swiftace"), "utf8")).toBe(BINARY)
    expect(await readdir(dir)).toEqual(["swiftace"])
    expect(requested).toEqual([
      `/releases/latest/download/SHA256SUMS`,
      `/releases/latest/download/${ASSET}`,
    ])
  })

  it("replaces an existing install", async () => {
    expect((await install()).status).toBe(0)
    expect((await install()).status).toBe(0)
    expect(await readdir(dir)).toEqual(["swiftace"])
  })

  it("installs the release SWIFTACE_VERSION names", async () => {
    expect((await install({ SWIFTACE_VERSION: "v0.1.1" })).status).toBe(0)
    expect(requested).toContain(`/releases/download/v0.1.1/${ASSET}`)
  })

  it("refuses a download that doesn't match the sums, and leaves nothing behind", async () => {
    files.set(`/releases/latest/download/${ASSET}`, `${BINARY}# tampered\n`)
    const result = await install()
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain("the download doesn't match its checksum")
    expect(await readdir(dir)).toEqual([])
  })

  it("refuses a release without this machine's binary", async () => {
    files.set("/releases/latest/download/SHA256SUMS", `${"0".repeat(64)}  swiftace-other-x64\n`)
    const result = await install()
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain(`SHA256SUMS doesn't list ${ASSET}`)
    expect(await readdir(dir)).toEqual([])
  })
})
