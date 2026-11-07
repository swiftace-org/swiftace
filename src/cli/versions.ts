// Release versions, like 0.12.3, as `swiftace upgrade` and scripts/check-version.ts read them.

/** The version in a release tag or package.json, without a leading v, or undefined. */
export function parseVersion(text: string): [number, number, number] | undefined {
  const [, major, minor, patch] = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(text.trim()) ?? []
  if (major === undefined || minor === undefined || patch === undefined) return undefined
  return [Number(major), Number(minor), Number(patch)]
}

/** Negative if a is older than b, positive if newer, 0 if they're the same release. */
export function compareVersions(a: string, b: string): number {
  const x = parseVersion(a)
  const y = parseVersion(b)
  if (!x || !y) throw new Error(`Not a version: ${x ? b : a}`)
  for (let i = 0; i < 3; i++) {
    const difference = x[i]! - y[i]!
    if (difference !== 0) return difference
  }
  return 0
}
