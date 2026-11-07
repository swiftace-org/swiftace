import { Jimp } from "jimp"
import { describe, expect, it, vi } from "vite-plus/test"

const send = vi.hoisted(() => vi.fn())
vi.mock("@/lib/config.server", () => ({ R2_BUCKET: "test" }))
vi.mock("@/lib/utils.server", () => ({ r2Client: { send } }))
vi.mock("@/lib/utils", () => ({
  toAbsoluteUrl: (path: string) => `https://academy.example${path}`,
}))

const { toCourseCover, toCourseImageType } = await import("./utils.server")
const { isCourseImagePath, toCourseImagePath, toCourseSocialImage } =
  await import("../../-lib/utils")
const { readCourseImage, uploadCourseImage } = await import("../../-lib/utils.server")

async function image(mime: "image/png" | "image/jpeg"): Promise<Uint8Array> {
  return new Uint8Array(await new Jimp({ width: 16, height: 9 }).getBuffer(mime))
}

describe("course image uploads", () => {
  it("takes a PNG or JPEG, judged by its bytes", async () => {
    expect(toCourseImageType(await image("image/png"))).toEqual({ type: "png" })
    expect(toCourseImageType(await image("image/jpeg"))).toEqual({ type: "jpg" })
    expect(toCourseImageType(new TextEncoder().encode("<svg></svg>"))).toEqual({
      error: "The image must be a PNG or JPEG.",
    })
  })

  it("turns away anything over 2 MB", () => {
    expect(toCourseImageType(new Uint8Array(2 * 1024 * 1024 + 1))).toEqual({
      error: "The image must be at most 2 MB.",
    })
  })

  it("stores each image under a content-hashed key with no slug in it", async () => {
    const png = await image("image/png")
    const key = await uploadCourseImage(png, "png")

    expect(key).toMatch(/^course-images\/[0-9a-f]{12}\.png$/)
    expect(await uploadCourseImage(png, "png")).toBe(key)
    expect(send.mock.calls[0][0].input).toMatchObject({ Key: key, ContentType: "image/png" })
    expect(toCourseImagePath(key)).toBe(`/assets/${key}`)
    expect(isCourseImagePath(toCourseImagePath(key))).toBe(true)
  })

  it("only reads keys under course-images/", async () => {
    send.mockClear()
    expect(await readCourseImage("certificates/abc.pdf")).toBeNull()
    expect(send).not.toHaveBeenCalled()
  })
})

describe("saving the cover", () => {
  const upload = "/assets/course-images/3fa9c2e1b07d.png"
  const legacy = "https://api.example.com/learn/course/intro/images/abc/cover.png"

  it("takes an upload, a removal or the cover already stored", () => {
    expect(toCourseCover(upload, legacy)).toEqual({ cover: upload })
    expect(toCourseCover("  ", legacy)).toEqual({ cover: null })
    expect(toCourseCover(legacy, legacy)).toEqual({ cover: legacy })
  })

  it("refuses any other URL", () => {
    expect(toCourseCover("https://evil.example/x.png", legacy)).toEqual({
      error: "Upload the course image rather than linking to one.",
    })
    expect(toCourseCover("/assets/course-images/../brand/icon.png", null)).toHaveProperty("error")
  })
})

describe("the course's social image", () => {
  it("is the cover, made absolute when it's served from here", () => {
    expect(toCourseSocialImage("/assets/course-images/3fa9c2e1b07d.png")).toBe(
      "https://academy.example/assets/course-images/3fa9c2e1b07d.png",
    )
    expect(toCourseSocialImage("/course/intro/images/abc/cover.png")).toBe(
      "https://academy.example/course/intro/images/abc/cover.png",
    )
    expect(toCourseSocialImage("https://i.imgur.com/x.png")).toBe("https://i.imgur.com/x.png")
    expect(toCourseSocialImage(null)).toBeNull()
  })
})
