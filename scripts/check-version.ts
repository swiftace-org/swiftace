// Checks package.json's version, which merging to main releases (see
// .github/workflows/release.yml), and prints what CI should do, for $GITHUB_OUTPUT:
//
//   version=0.4.1   package.json's version
//   release=true    whether to release it (the version changed)
//   build=true      whether to build and test the binary
//
// Given the git ref the changes are on top of (a PR's base, or main before a push), it checks the
// version moves one step if what goes into the binary changed, and stays put if not, so only
// changes to the binary make releases. Below 1.0, bump the minor version for breaking changes and
// the patch version for others. Without a ref, it releases and builds.
//
//   bun scripts/check-version.ts [<base ref>]
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join, resolve } from "node:path"

import { parseVersion } from "../src/cli/versions.ts"

const ROOT = resolve(import.meta.dirname, "..")
const PACKAGE = "package.json"
/** What the binary is made of, apart from the tests beside the code. */
const BINARY = [
  "src/",
  "drizzle/",
  "public/",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "tsconfig.json",
  "vite.config.ts",
  "scripts/build.ts",
  // Published beside the binaries, so a change to it is a release too.
  "scripts/install.sh",
]
const TESTS = /\.test\.tsx?$/
/** What tests the binary, which needs a build to check but not a release. */
const BINARY_TESTS = ["scripts/smoke-test.ts", "test/", ".github/workflows/release.yml"]

const file = readFileSync(join(ROOT, PACKAGE), "utf8")
const version = versionOf(file)
if (!version) fail(`${PACKAGE}'s version should be a release's, like 0.1.0`)

let release = true
let build = true
const base = process.argv[2]
if (base) {
  const baseFile = gitShow(`${base}:${PACKAGE}`)
  // Before there were releases, there was no version (or no package.json).
  const [major, minor, patch] = (baseFile && versionOf(baseFile)) || [0, 0, 0]
  const changed = git("diff", "--name-only", base, "HEAD").split("\n").filter(Boolean)
  const binaryChanged =
    changed.some((path) => !TESTS.test(path) && BINARY.some((input) => path.startsWith(input))) ||
    withoutVersion(file) !== (baseFile ? withoutVersion(baseFile) : undefined)
  release = version.join(".") !== [major, minor, patch].join(".")
  build =
    binaryChanged || changed.some((path) => BINARY_TESTS.some((input) => path.startsWith(input)))

  if (binaryChanged) {
    const bumps = [
      [major, minor, patch + 1],
      [major, minor + 1, 0],
      [major + 1, 0, 0],
    ].map((bump) => bump.join("."))
    if (!bumps.includes(version.join("."))) {
      fail(
        `The binary changed, so ${PACKAGE}'s version should be one of ${bumps.join(", ")}, one ` +
          `step from ${base}'s ${[major, minor, patch].join(".")}, but it's ` +
          `${version.join(".")}. Below 1.0, bump the minor version for breaking changes and the ` +
          "patch version for others.",
      )
    }
  } else if (release) {
    fail(
      `Nothing in the binary changed, so ${PACKAGE}'s version should stay ` +
        `${[major, minor, patch].join(".")}, not ${version.join(".")}: a release would be the same ` +
        "binary.",
    )
  }
}
console.log(`version=${version.join(".")}\nrelease=${release}\nbuild=${build}`)

function git(...args: string[]): string {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" })
}

/** A file at a ref, or undefined if it isn't there. */
function gitShow(spec: string): string | undefined {
  try {
    return execFileSync("git", ["show", spec], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
  } catch {
    return undefined
  }
}

function versionOf(packageJson: string) {
  const parsed: unknown = JSON.parse(packageJson)
  const version = typeof parsed === "object" && parsed && "version" in parsed ? parsed.version : ""
  // A release tag's leading v isn't allowed here.
  return /^\d/.test(String(version)) ? parseVersion(String(version)) : undefined
}

/** package.json as the binary sees it: its version only names the release. */
function withoutVersion(packageJson: string): string {
  return JSON.stringify({ ...(JSON.parse(packageJson) as object), version: undefined })
}

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}
