import { readFile } from "node:fs/promises"

import { Jimp } from "jimp"
import { beforeAll, describe, expect, it, vi } from "vite-plus/test"

vi.mock("@/lib/config.server", () => ({ R2_BUCKET: "test" }))
vi.mock("@/lib/utils.server", () => ({
  getSiteConfig: async () => ({ branding: { icon: "" } }),
  getSiteUrl: () => "https://academy.example",
  r2Client: { send: vi.fn() },
}))

const { readFaviconIco, readIconPng } = await import("./utils.server")

beforeAll(async () => {
  const defaultIcon = await readFile(
    new URL("../../../../public/defaults/icon.png", import.meta.url),
  )
  vi.stubGlobal("fetch", async () => new Response(defaultIcon))
})

describe("icon renditions", () => {
  it("resizes the icon to the size asked for", async () => {
    const image = await Jimp.read(Buffer.from(await readIconPng(192)))
    expect([image.bitmap.width, image.bitmap.height]).toEqual([192, 192])
  })

  it("fills transparency for the apple-touch icon", async () => {
    const image = await Jimp.read(Buffer.from(await readIconPng(180, { opaque: true })))
    // The default icon's rounded corners are transparent until they're filled.
    expect(image.getPixelColor(0, 0)).toBe(0xffffffff)
  })

  it("packs 16, 32 and 48 pixel PNGs into a valid .ico", async () => {
    const ico = Buffer.from(await readFaviconIco())
    expect([ico.readUInt16LE(0), ico.readUInt16LE(2), ico.readUInt16LE(4)]).toEqual([0, 1, 3])

    for (const [index, size] of [16, 32, 48].entries()) {
      const entry = 6 + 16 * index
      expect([ico[entry], ico[entry + 1]]).toEqual([size, size])
      const length = ico.readUInt32LE(entry + 8)
      const offset = ico.readUInt32LE(entry + 12)
      const png = await Jimp.read(ico.subarray(offset, offset + length))
      expect(png.bitmap.width).toBe(size)
    }
  })
})
