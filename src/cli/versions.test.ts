import { describe, expect, it } from "vite-plus/test"

import { findChecksum } from "./upgrade"
import { compareVersions, parseVersion } from "./versions"

describe("versions", () => {
  it("reads release versions, with or without a v", () => {
    expect(parseVersion("0.12.3")).toEqual([0, 12, 3])
    expect(parseVersion("v1.0.0")).toEqual([1, 0, 0])
    for (const bad of ["1.0", "1.0.0-beta", "latest", "", "1.0.0.0"]) {
      expect(parseVersion(bad)).toBeUndefined()
    }
  })

  it("orders them by number, not as text", () => {
    expect(compareVersions("0.10.0", "0.9.9")).toBeGreaterThan(0)
    expect(compareVersions("0.1.0", "0.1.1")).toBeLessThan(0)
    expect(compareVersions("v1.2.3", "1.2.3")).toBe(0)
    expect(compareVersions("2.0.0", "1.99.99")).toBeGreaterThan(0)
    expect(() => compareVersions("1.0", "1.0.0")).toThrow(/Not a version: 1.0/)
  })

  it("finds an asset's hash in SHA256SUMS, as sha256sum writes it", () => {
    const sums = "aaa  swiftace-linux-x64\nbbb *swiftace-linux-arm64\n"
    expect(findChecksum(sums, "swiftace-linux-x64")).toBe("aaa")
    expect(findChecksum(sums, "swiftace-linux-arm64")).toBe("bbb")
    expect(findChecksum(sums, "swiftace-darwin-x64")).toBeUndefined()
  })
})
