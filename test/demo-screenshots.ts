// The demo site's screenshots, for SwiftAce's website and docs: each page in light and dark, at
// twice its size, as <name>-<theme>.webp. Signs in the way a person would, with an emailed link.
import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"

import { chromium, type Browser, type BrowserContext, type Page } from "playwright"

import type { FakeEmail } from "./fake-services.ts"

type Shot = {
  name: string
  path: string
  signedIn: boolean
  /** Readies the page once it's loaded: opens a panel, scrolls to something. */
  prepare?: (page: Page) => Promise<void>
}

const SHOTS: Shot[] = [
  { name: "home", path: "/", signedIn: false },
  {
    name: "course",
    path: "/course/data-analysis-with-python",
    signedIn: true,
    prepare: closeTutor,
  },
  {
    name: "lesson",
    path: "/course/data-analysis-with-python/lesson/analyzing-tabular-data-with-pandas",
    signedIn: true,
    prepare: openTutorConversation,
  },
  {
    name: "participants",
    path: "/course/data-analysis-with-python/manage/participants",
    signedIn: true,
  },
  {
    name: "sections",
    path: "/course/data-analysis-with-python/manage",
    signedIn: true,
  },
  { name: "config", path: "/manage/config", signedIn: true },
]

export async function takeScreenshots(options: {
  base: string
  dir: string
  email: string
  emails: () => FakeEmail[]
}) {
  await mkdir(options.dir, { recursive: true })
  const browser = await chromium.launch()
  try {
    // Once for both themes, since sign-in emails are rate limited.
    const session = await signIn(browser, options)
    for (const theme of ["light", "dark"] as const) {
      for (const shot of SHOTS) {
        const context = await newContext(browser, theme, shot.signedIn ? session : undefined)
        const page = await context.newPage()
        await page.goto(options.base + shot.path, { waitUntil: "networkidle" })
        await shot.prepare?.(page)
        await page.waitForTimeout(500)
        const webp = await toWebp(page, await page.screenshot())
        await writeFile(join(options.dir, `${shot.name}-${theme}.webp`), webp)
        console.log(`Saved ${shot.name}-${theme}.webp`)
        await context.close()
      }
    }
  } finally {
    await browser.close()
  }
}

function newContext(
  browser: Browser,
  theme: "light" | "dark",
  storageState?: Awaited<ReturnType<BrowserContext["storageState"]>>,
) {
  return browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: theme,
    storageState,
  })
}

/** Signs in with the link in the emailed code, and returns the session to reuse for each shot. */
async function signIn(
  browser: Browser,
  { base, email, emails }: { base: string; email: string; emails: () => FakeEmail[] },
) {
  const context = await newContext(browser, "light")
  const page = await context.newPage()
  const sent = emails().length
  await page.goto(`${base}/login`, { waitUntil: "networkidle" })
  await page.getByRole("textbox").first().fill(email)
  await page.keyboard.press("Enter")
  const deadline = Date.now() + 15_000
  let link: string | undefined
  while (!link && Date.now() < deadline) {
    await Bun.sleep(200)
    link = emails()
      .slice(sent)
      .find((message) => message.to.includes(email))
      ?.text.match(/https?:\/\/\S+\/login\/verify\?token=\S+/)?.[0]
  }
  if (!link) throw new Error(`No sign-in email reached ${email}`)
  await page.goto(link, { waitUntil: "networkidle" })
  const state = await context.storageState()
  await context.close()
  return state
}

async function closeTutor(page: Page) {
  const close = page.getByRole("button", { name: /close/i }).first()
  if (await close.isVisible()) await close.click()
}

async function openTutorConversation(page: Page) {
  await page.getByRole("button", { name: "Conversations" }).click()
  await page.getByText("Grouping orders by month").click()
  await page.waitForTimeout(1000)
  // The conversation opens at its end; its start is what the screenshot is for.
  await page.evaluate(() => {
    for (const element of document.querySelectorAll("*")) {
      const scrolls = element.scrollHeight > element.clientHeight + 10
      if (scrolls && element.getBoundingClientRect().left > window.innerWidth / 2) {
        element.scrollTop = 0
      }
    }
  })
}

/** Chromium encodes WebP from a canvas, which saves a dependency for it. */
async function toWebp(page: Page, png: Buffer): Promise<Buffer> {
  // A blank page, so the site's Content-Security-Policy can't refuse the data URL.
  const blank = await page.context().newPage()
  const dataUrl = await blank.evaluate(async (base64) => {
    const image = new Image()
    image.src = `data:image/png;base64,${base64}`
    await image.decode()
    const canvas = document.createElement("canvas")
    canvas.width = image.width
    canvas.height = image.height
    canvas.getContext("2d")!.drawImage(image, 0, 0)
    return canvas.toDataURL("image/webp", 0.82)
  }, png.toString("base64"))
  await blank.close()
  return Buffer.from(dataUrl.split(",")[1]!, "base64")
}
