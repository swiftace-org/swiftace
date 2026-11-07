// Runs a built binary end to end against a real Postgres and the fake services, driving the site in
// headless Chromium: server rendering and hydration, signing in with an emailed code (rendered by
// react-email), making an admin, a certificate's PDF and preview (pdf-lib, PDFium and Jimp), the
// AI tutor's streamed reply, and Stripe's client. It needs an empty database it may fill.
//
//   DATABASE_URL=postgres://… bun test/integration.ts dist/swiftace
//
// Chromium comes from `vp exec playwright install chromium`.
import { resolve } from "node:path"

import { Jimp } from "jimp"
import pg from "pg"
import { chromium, type Browser, type Locator, type Page } from "playwright"

import { FAKE_TUTOR_REPLY, fakeServiceEnv, startFakeServices } from "./fake-services.ts"

const binary = resolve(process.argv[2] ?? "dist/swiftace")
const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) throw new Error("Set DATABASE_URL to an empty database the test may fill")
const PORT = Number(process.env.TEST_PORT ?? 4311)
const PREVIEW_PORT = PORT + 1
const base = `http://127.0.0.1:${PORT}`
const EMAIL = "learner@example.com"
const COURSE = "integration-course"

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Integration test failed: ${message}`)
  console.log(`ok - ${message}`)
}

// The tutor thinks for longer than Bun's default idle timeout before it streams, as a reasoning
// model can, so a server that cut quiet connections off would lose the reply.
const fakes = await startFakeServices({ tutorThinkMs: 11_000 })
const env = {
  ...process.env,
  ...fakeServiceEnv(fakes.url),
  DATABASE_URL,
  JWT_SECRET_KEY: "integration-jwt-secret",
  HASH_SECRET_KEY: "integration-hash-secret",
  EMAIL_DOMAIN: "example.com",
  NOTEBOOK_PREVIEW_URL: `http://127.0.0.1:${PREVIEW_PORT}`,
  HOST: "127.0.0.1",
  PORT: String(PORT),
  PREVIEW_PORT: String(PREVIEW_PORT),
  PREVIEW_ALLOWED_PARENT_ORIGINS: base,
}

const migrated = Bun.spawnSync([binary, "migrate"], { env })
check(migrated.exitCode === 0, `swiftace migrate: ${migrated.stdout.toString().trim()}`)
const db = new pg.Client({ connectionString: DATABASE_URL })
await db.connect()
await seed(db)

const server = Bun.spawn([binary, "start"], { env, stdout: "inherit", stderr: "inherit" })
let browser: Browser | undefined
let page: Page | undefined
try {
  browser = await chromium.launch()
  for (let i = 0; !(await fetch(`${base}/status`).catch(() => null))?.ok; i++) {
    if (i > 300) throw new Error("The server didn't start")
    await Bun.sleep(100)
  }
  page = await browser.newPage()
  // Holds back the client's scripts, so each page's server HTML shows well before React hydrates
  // it, as on a slow machine. CI sets it, so every step has to wait for its controls to hydrate.
  const scriptDelay = Number(process.env.TEST_SCRIPT_DELAY_MS ?? 0)
  if (scriptDelay) {
    await page.route(/\/assets\/.*\.js$/, async (route) => {
      await Bun.sleep(scriptDelay)
      await route.continue()
    })
  }
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })

  // Server rendering, then hydration: a client-side navigation keeps the page's window.
  const html = await (await fetch(base)).text()
  check(html.includes("Hands-On Courses"), "the home page is rendered on the server")
  await page.goto(base)
  await page.waitForLoadState("networkidle")
  await page.evaluate(() => ((window as unknown as { marker: number }).marker = 1))
  await (await hydrated(page.getByRole("link", { name: /log in|sign in/i }).first())).click()
  await page.waitForURL(/\/login/)
  check(
    await page.evaluate(() => (window as unknown as { marker?: number }).marker === 1),
    "the page hydrates and navigates on the client",
  )

  // The notebook preview runs posted code, framed as the app frames it, with an opaque origin.
  await page.goto(`${base}/status`)
  const sandboxed = await page.evaluate(async (src) => {
    const iframe = document.createElement("iframe")
    iframe.sandbox.add("allow-scripts")
    iframe.src = src
    const reply = new Promise<{ cookie: string; origin: string }>((resolve) =>
      addEventListener("message", (event) => {
        if (event.source === iframe.contentWindow && event.data?.cookie) resolve(event.data)
      }),
    )
    iframe.onload = () =>
      iframe.contentWindow!.postMessage(
        {
          iframeEvaluation: `let cookie = "readable"
            try { document.cookie } catch { cookie = "blocked" }
            parent.postMessage({ cookie, origin: self.origin }, "*")`,
        },
        "*",
      )
    document.body.append(iframe)
    return reply
  }, env.NOTEBOOK_PREVIEW_URL)
  check(
    sandboxed.origin === "null" && sandboxed.cookie === "blocked",
    "the notebook preview runs posted code with an opaque origin and no cookies",
  )

  await signIn(page)
  const made = Bun.spawnSync([binary, "make-admin", EMAIL], { env })
  check(made.exitCode === 0, `swiftace make-admin: ${made.stdout.toString().trim()}`)
  await db.query(
    `insert into course_enrollments (created_at, updated_at, course_id, enrollee_id, deleted)
     select now(), now(), c.id, a.id, false from courses c, accounts a where c.name = $1 and a.email = $2`,
    [COURSE, EMAIL],
  )

  // A certificate: pdf-lib draws on the template, PDFium renders the preview, Jimp encodes it.
  await page.goto(`${base}/course/${COURSE}/manage/participants`)
  await (await hydrated(page.getByRole("button", { name: "Generate certificate" }).first())).click()
  await page.getByLabel("Name on the certificate").fill("Ada Lovelace")
  await page.getByLabel("Hours of coursework").fill("12")
  await page.getByRole("button", { name: "Generate", exact: true }).click()
  await page.getByRole("button", { name: "Regenerate certificate" }).first().waitFor()
  const stored = [...fakes.state.objects.entries()]
  const pdf = stored.find(([key]) => key.endsWith(".pdf"))?.[1].body
  const jpeg = stored.find(([key]) => /\.jpe?g$/.test(key))?.[1].body
  check(
    pdf && new TextDecoder().decode(pdf.subarray(0, 5)) === "%PDF-",
    "the certificate's PDF is stored",
  )
  const preview = jpeg ? await Jimp.read(Buffer.from(jpeg)) : undefined
  check(preview && preview.width > 1000, `its ${preview?.width}px preview is rendered by PDFium`)

  // The AI tutor's reply, streamed from the fake model through the server.
  await page.goto(`${base}/course/${COURSE}`)
  const message = page.getByLabel("Message AI Tutor")
  const open = page.getByRole("button", { name: "Ask AI Tutor" }).first()
  // Desktop layouts open the panel by default, hiding the button that opens it.
  await hydrated(message.or(open).first())
  if (!(await message.isVisible())) await open.click()
  await (await hydrated(message)).fill("What is a list in Python?")
  await page.getByRole("button", { name: "Send" }).click()
  await page.getByText(FAKE_TUTOR_REPLY).waitFor({ timeout: 40_000 })
  const tutorRequest = fakes.state.openaiRequests.find((body) => body.stream)
  check(tutorRequest, "the AI tutor streams the model's reply, after 11 quiet seconds")

  // Stripe's client, with a key Stripe refuses: the failure is Stripe's answer, not a crash.
  await page.goto(`${base}/pricing`)
  await page.waitForLoadState("networkidle")
  check((await page.title()).length > 0, "the pricing page renders with Stripe billing on")

  check(
    errors.length === 0,
    `no errors in the browser${errors.length ? `: ${errors.join("; ")}` : ""}`,
  )
  console.log(
    `Memory: ${Math.round(Number(Bun.spawnSync(["ps", "-o", "rss=", "-p", String(server.pid)]).stdout.toString()) / 1024)} MB RSS`,
  )
} catch (error) {
  // What the page showed, to see why.
  await page?.screenshot({ path: "integration-failure.png", fullPage: true }).catch(() => {})
  throw error
} finally {
  await browser?.close()
  server.kill()
  await server.exited
  await db.end()
  await fakes.stop()
}
console.log("All good")

/**
 * A control once React has hydrated it. Before then the page is only the server's HTML, where a
 * click does nothing and a typed value is lost when React takes over (as on a slow CI runner).
 */
async function hydrated(locator: Locator): Promise<Locator> {
  await locator.waitFor()
  // React keeps each hydrated element's props on it, under a key like `__reactProps$…`.
  await locator
    .page()
    .waitForFunction(
      (element) => !!element && Object.keys(element).some((key) => key.startsWith("__reactProps$")),
      await locator.elementHandle(),
    )
  return locator
}

async function signIn(page: Page) {
  await page.goto(`${base}/login`)
  await (await hydrated(page.getByLabel("Email"))).fill(EMAIL)
  await page.getByRole("button", { name: "Continue with Email" }).click()
  await page.waitForURL(/\/login\/verify/)
  const email = fakes.state.emails.at(-1)
  const code = /\b(\d{6})\b/.exec(email?.text ?? "")?.[1]
  check(
    email?.to.includes(EMAIL) && code,
    `the sign-in email is rendered and sent: "${email?.subject}"`,
  )
  await page
    .locator("input[autocomplete='one-time-code'], input[data-input-otp]")
    .first()
    .fill(code)
  const name = page.getByLabel("Full name")
  if (await name.isVisible()) await name.fill("Ada Lovelace")
  await page.getByRole("button", { name: "Verify" }).click()
  await page.waitForURL((url) => !url.pathname.startsWith("/login"))
  const cookies = await page.context().cookies()
  check(
    cookies.some((cookie) => cookie.name === "AUTH_TOKEN"),
    "signing in with the code works",
  )
}

/** A published course with a lesson and a certificate template, and the integrations on. */
async function seed(client: pg.Client) {
  const integrations = {
    googleLogin: { enabled: false, clientId: "", clientSecret: "" },
    githubLogin: { enabled: false, clientId: "", clientSecret: "" },
    billing: {
      enabled: true,
      stripeSecretKey: "sk_test_integration_not_a_real_key",
      stripeWebhookSecret: "whsec_integration",
      monthlyPriceId: "price_monthly",
      annualPriceId: "price_annual",
    },
    turnstile: { enabled: false, siteKey: "", secretKey: "" },
    posthog: { enabled: false, projectToken: "", host: "https://us.i.posthog.com" },
    openai: { enabled: true, apiKey: "sk-integration-fake" },
  }
  for (const [section, data] of Object.entries({ integrations, aiTutor: { enabled: true } })) {
    await client.query(
      "insert into site_config (section, data) values ($1, $2) on conflict (section) do update set data = $2",
      [section, JSON.stringify(data)],
    )
  }
  const { rows } = await client.query<{ id: number }>(
    `insert into accounts (created_at, updated_at, name, username, email, is_admin, flagged_as_spammer)
     values (now(), now(), 'Course Owner', 'owner', 'owner@example.com', true, false) returning id`,
  )
  const ownerId = rows[0]!.id
  const course = await client.query<{ id: number }>(
    `insert into courses (created_at, updated_at, owner_id, name, title, short_description, published, visibility,
       certificate_template, offers_certificate, is_paid, deleted, sections)
     values (now(), now(), $1, $2, 'Integration Course', 'A course for the integration test', true, 'PUBLIC',
       $3, true, false, false, '[]') returning id`,
    [ownerId, COURSE, `${fakes.url}/certificate-template.pdf`],
  )
  await client.query(
    `insert into course_sections (created_at, updated_at, course_id, slug, title, section_type, deleted, visibility)
     values (now(), now(), $1, 'first-lesson', 'First Lesson', 'LESSON', false, 'PUBLIC')`,
    [course.rows[0]!.id],
  )
}
