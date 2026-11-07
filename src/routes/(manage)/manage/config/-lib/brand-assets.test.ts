import { Jimp } from "jimp"
import { describe, expect, it } from "vite-plus/test"

import { detectBrandImageType, toBrandAssetError } from "./utils.server"

async function png(width: number, height: number): Promise<Uint8Array> {
  return new Uint8Array(await new Jimp({ width, height, color: 0xff0000ff }).getBuffer("image/png"))
}

describe("branding uploads", () => {
  it("reads the type from the bytes rather than the file name", async () => {
    const jpeg = new Uint8Array(await new Jimp({ width: 4, height: 4 }).getBuffer("image/jpeg"))
    const svg = new TextEncoder().encode(
      '<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg"/>',
    )

    expect(detectBrandImageType(await png(4, 4))).toBe("png")
    expect(detectBrandImageType(jpeg)).toBe("jpg")
    expect(detectBrandImageType(svg)).toBe("svg")
    expect(detectBrandImageType(new TextEncoder().encode("<html></html>"))).toBeNull()
  })

  it("only takes a square icon of at least 512 pixels", async () => {
    expect(await toBrandAssetError("icon", await png(512, 512), "png")).toBeNull()
    expect(await toBrandAssetError("icon", await png(600, 512), "png")).toBe(
      "The icon must be square, not 600 × 512.",
    )
    expect(await toBrandAssetError("icon", await png(256, 256), "png")).toBe(
      "The icon must be at least 512 × 512 pixels, not 256 × 256.",
    )
    expect(await toBrandAssetError("icon", new Uint8Array(10), "svg")).toBe(
      "The icon must be a PNG.",
    )
  })

  it("names the formats each image accepts", async () => {
    expect(await toBrandAssetError("socialImage", new Uint8Array(10), "svg")).toBe(
      "The social preview image must be PNG or JPEG.",
    )
  })
})

describe("favicon uploads", () => {
  it("takes a well-formed .ico and rejects a truncated one", async () => {
    const image = await png(16, 16)
    const ico = new Uint8Array(6 + 16 + image.length)
    const view = new DataView(ico.buffer)
    view.setUint16(2, 1, true)
    view.setUint16(4, 1, true)
    ico[6] = 16
    ico[7] = 16
    view.setUint32(6 + 8, image.length, true)
    view.setUint32(6 + 12, 22, true)
    ico.set(image, 22)

    expect(detectBrandImageType(ico)).toBe("ico")
    expect(await toBrandAssetError("favicon", ico, "ico")).toBeNull()
    expect(await toBrandAssetError("favicon", ico.subarray(0, 30), "ico")).toBe(
      "That .ico couldn't be read. Please export it again and retry.",
    )
    expect(await toBrandAssetError("favicon", image, "png")).toBe("The favicon must be an .ico.")
  })
})
