import { spawnSync } from "node:child_process"
import { mkdir, mkdtemp, readdir, readFile, rm, stat, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test"

import {
  chooseDomains,
  domainsProblem,
  preflightProblem,
  service,
  servicePorts,
  validateCaddyfile,
} from "./deploy"
import { ensureEnvFile, parseEnvFile } from "./env-file"
import { REQUIRED_VARIABLES } from "./environment"

describe("preflightProblem", () => {
  it("refuses anything but the binary, as root, on Linux", () => {
    const ok = { platform: "linux", isBinary: true, uid: 0 }
    expect(preflightProblem(ok)).toBeUndefined()
    expect(preflightProblem({ ...ok, uid: 1000 })).toBe("Run it as root, e.g. with sudo")
    expect(preflightProblem({ ...ok, platform: "darwin" })).toMatch(/Linux/)
    expect(preflightProblem({ ...ok, isBinary: false })).toMatch(/built binary/)
  })
})

describe("domains", () => {
  it("falls back to the last deploy's for those left out", () => {
    const saved = { domains: ["example.com", "www.example.com"], previewDomain: "p.example.com" }
    expect(chooseDomains([], undefined, saved)).toEqual(saved)
    expect(chooseDomains(["New.com"], undefined, saved)).toEqual({
      domains: ["new.com"],
      previewDomain: "p.example.com",
    })
    expect(chooseDomains([], "preview.example.com", saved).previewDomain).toBe(
      "preview.example.com",
    )
    expect(chooseDomains([], undefined, undefined)).toEqual({ domains: [] })
  })

  it("refuses missing, malformed and repeated domains", () => {
    expect(domainsProblem({ domains: ["example.com"], previewDomain: "p.example.com" })).toBe(
      undefined,
    )
    expect(domainsProblem({ domains: [] })).toMatch(/Give the site's domain/)
    for (const bad of ["localhost", "example.com/path", "-x.com", "a b.com", "example.com:80"]) {
      expect(domainsProblem({ domains: [bad] })).toBe(`Not a domain: ${bad}`)
    }
    expect(domainsProblem({ domains: ["example.com"], previewDomain: "example.com" })).toMatch(
      /only be given once/,
    )
  })
})

describe("servicePorts", () => {
  it("uses the env file's ports or the defaults, and keeps HOST on loopback", () => {
    expect(servicePorts(new Map())).toEqual({ ok: true, port: 4000, previewPort: 4100 })
    expect(servicePorts(new Map([["PORT", "4005"]]))).toEqual({
      ok: true,
      port: 4005,
      previewPort: 4100,
    })
    for (const [name, value] of [
      ["HOST", "0.0.0.0"],
      ["PORT", "80"],
      ["PORT", "abc"],
      ["PREVIEW_PORT", "70000"],
      ["PREVIEW_PORT", "4000"],
    ] as const) {
      expect(servicePorts(new Map([[name, value]]))).toMatchObject({ ok: false })
    }
  })
})

describe("service", () => {
  it("runs unprivileged and locked down, with the preview tied to the site", () => {
    const lines = service({
      binary: "/usr/local/bin/swiftace",
      port: 4000,
      previewPort: 4100,
      domain: "example.com",
    }).split("\n")
    for (const directive of [
      "ExecStart=/usr/local/bin/swiftace start",
      "DynamicUser=yes",
      "NoNewPrivileges=yes",
      "ProtectSystem=strict",
      "ProtectHome=yes",
      "PrivateTmp=yes",
      "CapabilityBoundingSet=",
      "Environment=HOST=127.0.0.1",
      "Environment=PORT=4000",
      "Environment=PREVIEW_PORT=4100",
      "Environment=PREVIEW_ALLOWED_PARENT_ORIGINS=https://example.com",
      "EnvironmentFile=/etc/swiftace.env",
    ]) {
      expect(lines).toContain(directive)
    }
    // Bun's JIT needs writable, executable memory.
    expect(lines).not.toContain("MemoryDenyWriteExecute=yes")
  })
})

describe("ensureEnvFile", () => {
  let dir: string
  let file: string
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "swiftace-env-"))
    file = join(dir, "swiftace.env")
  })
  afterEach(() => rm(dir, { recursive: true, force: true }))

  it("creates a root-only file with every variable and new secrets", async () => {
    const { created, variables } = await ensureEnvFile(file)
    expect(created).toBe(true)
    expect((await stat(file)).mode & 0o777).toBe(0o600)
    expect([...variables.keys()]).toEqual([...REQUIRED_VARIABLES])
    expect(variables.get("JWT_SECRET_KEY")).toMatch(/^[0-9a-f]{64}$/)
    expect(variables.get("HASH_SECRET_KEY")).toMatch(/^[0-9a-f]{64}$/)
    expect(variables.get("JWT_SECRET_KEY")).not.toBe(variables.get("HASH_SECRET_KEY"))
    expect(variables.get("DATABASE_URL")).toBe("")
  })

  it("never overwrites a value, and only adds the variables it's missing", async () => {
    const existing = "# mine\nDATABASE_URL=postgres://x\nJWT_SECRET_KEY=keep\nPORT=4005"
    await writeFile(file, existing, { mode: 0o644 })
    await ensureEnvFile(file)
    const text = await readFile(file, "utf8")
    expect(text.startsWith(`${existing}\n`)).toBe(true)
    const variables = parseEnvFile(text)
    expect(variables.get("JWT_SECRET_KEY")).toBe("keep")
    expect(variables.get("PORT")).toBe("4005")
    expect(variables.get("HASH_SECRET_KEY")).toMatch(/^[0-9a-f]{64}$/)

    const again = await ensureEnvFile(file)
    expect(again.created).toBe(false)
    expect(await readFile(file, "utf8")).toBe(text)
  })

  it("refuses a link, which would write wherever it points", async () => {
    await writeFile(join(dir, "target"), "")
    await symlink(join(dir, "target"), file)
    await expect(ensureEnvFile(file)).rejects.toThrow(/should be a file/)
  })

  it("reads values as systemd does", () => {
    const variables = parseEnvFile("A=1\n# B=2\nA=\"3\"\n  C = x\nD='q z'\n")
    expect(Object.fromEntries(variables)).toEqual({ A: "3", D: "q z" })
  })
})

const HAS_CADDY = spawnSync("caddy", ["version"]).status === 0

// With Caddy itself, which CI installs. A config with relative imports, as a real one can have.
describe.skipIf(!HAS_CADDY && !process.env.CI)("validateCaddyfile", () => {
  let dir: string
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "swiftace-caddy-"))
    // Caddy's storage, so validating touches nothing of the machine's own.
    process.env.XDG_DATA_HOME = join(dir, "data")
    process.env.XDG_CONFIG_HOME = join(dir, "config")
    await mkdir(join(dir, "etc/snippets"), { recursive: true })
    await mkdir(join(dir, "etc/sites"), { recursive: true })
    await writeFile(join(dir, "etc/snippets/common.caddy"), "(common) {\n\tencode gzip\n}\n")
    await writeFile(join(dir, "etc/sites/other.caddy"), 'other.example.org {\n\trespond "hi"\n}\n')
  })
  afterEach(() => rm(dir, { recursive: true, force: true }))

  const CANDIDATE = `import snippets/common.caddy
import sites/*

example.com {
\timport common
\treverse_proxy 127.0.0.1:4000
}
`

  it("resolves imports beside the live Caddyfile, and leaves nothing behind", async () => {
    const live = join(dir, "etc/Caddyfile")
    await writeFile(live, "")
    await validateCaddyfile(live, CANDIDATE)
    expect((await readdir(join(dir, "etc"))).sort()).toEqual(["Caddyfile", "sites", "snippets"])
  })

  it("would reject the same config checked from anywhere else", async () => {
    await mkdir(join(dir, "elsewhere"))
    await expect(validateCaddyfile(join(dir, "elsewhere/Caddyfile"), CANDIDATE)).rejects.toThrow(
      /caddy validate/,
    )
  })

  it("rejects a config Caddy can't load", async () => {
    await expect(
      validateCaddyfile(join(dir, "etc/Caddyfile"), "example.com {\n\tnot_a_directive\n}\n"),
    ).rejects.toThrow(/not_a_directive/)
  })
})
