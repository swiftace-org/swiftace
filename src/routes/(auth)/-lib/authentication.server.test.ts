import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

const read = vi.hoisted(() => vi.fn())
vi.mock("./db.server", () => ({ readAuthenticationKeys: read }))

beforeEach(() => {
  vi.resetModules()
  read.mockReset()
})

describe("server authentication keys", () => {
  it("loads database keys once and shares concurrent reads", async () => {
    read.mockResolvedValue({ signingKey: "database-signing", hashKey: "database-hash" })
    const { getAuthenticationKeys } = await import("./authentication.server")
    const keys = await Promise.all([getAuthenticationKeys(), getAuthenticationKeys()])
    expect(keys).toEqual([
      { signingKey: "database-signing", hashKey: "database-hash" },
      { signingKey: "database-signing", hashKey: "database-hash" },
    ])
    read.mockResolvedValue({ signingKey: "changed", hashKey: "changed" })
    expect(await getAuthenticationKeys()).toEqual(keys[0])
    expect(read).toHaveBeenCalledTimes(1)
  })

  it("fails closed for missing keys and retries after initialization", async () => {
    read.mockResolvedValue({ signingKey: "", hashKey: "test-hash" })
    const { getAuthenticationKeys } = await import("./authentication.server")
    await expect(getAuthenticationKeys()).rejects.toThrow("Authentication keys are missing")
    read.mockResolvedValue({ signingKey: "ready-signing", hashKey: "ready-hash" })
    await expect(getAuthenticationKeys()).resolves.toEqual({
      signingKey: "ready-signing",
      hashKey: "ready-hash",
    })
  })
})
