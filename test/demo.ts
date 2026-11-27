// Runs a demo site with realistic content against the fake services, for trying SwiftAce out,
// testing by hand and taking screenshots. An empty database is seeded with test/demo-data.ts in
// one transaction, which also marks it as the demo's. A marked one is reused, and any other is
// refused, so the demo never overwrites a real site's settings. Images live in the fakes, so
// they're uploaded again on every run, and the settings and covers are pointed at them.
//
//   DATABASE_URL=postgres://… bun test/demo.ts [dist/swiftace] [--screenshots <dir>]
//
// With a binary, it migrates and runs it on PORT (4000), or with `--screenshots` saves
// light and dark screenshots to <dir> and stops. Without a binary, it seeds the database for
// `vp run dev` and prints the environment to use. Sign in as admin@example.com or any learner.
// The emailed codes are printed here.
import { createHash } from "node:crypto"
import { resolve } from "node:path"

import pg from "pg"
import { chromium } from "playwright"

import { AUTHENTICATION_CONFIG_SECTION } from "../src/routes/(auth)/-lib/constants.ts"
import {
  ADMIN,
  ADMIN_PROGRESS,
  COURSES,
  coverHtml,
  demoNotebook,
  ICON_HTML,
  LEARNER_PROGRESS,
  LEARNERS,
  SITE,
  sectionVideo,
  TUTOR_CONVERSATION,
} from "./demo-data.ts"
import { takeScreenshots } from "./demo-screenshots.ts"
import { fakeServiceEnv, startFakeServices } from "./fake-services.ts"

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) throw new Error("Set DATABASE_URL to a database the demo may fill")
const args = process.argv.slice(2)
const screenshotsFlag = args.indexOf("--screenshots")
const screenshotsDir = screenshotsFlag >= 0 ? args.splice(screenshotsFlag, 2)[1] : undefined
if (screenshotsFlag >= 0 && !screenshotsDir) throw new Error("Pass a directory to --screenshots")
const binary = args[0] ? resolve(args[0]) : null
if (screenshotsDir && !binary) throw new Error("Taking screenshots needs a binary to run")
const PORT = Number(process.env.PORT ?? 4000)
const HOST = process.env.HOST ?? "127.0.0.1"
const BUCKET = "swiftace-demo"
/** The `site_config` section that marks a database as seeded by the demo. The app ignores it. */
const DEMO_SECTION = "demo"

const fakes = await startFakeServices()
const notebooks = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch: () => Response.json(demoNotebook()),
})
const notebookUrl = `http://127.0.0.1:${notebooks.port}/analyzing-tabular-data-with-pandas.ipynb`

const env: Record<string, string | undefined> = {
  ...process.env,
  ...fakeServiceEnv(fakes.url),
  HOST,
  PORT: String(PORT),
  PREVIEW_PORT: "0",
  PREVIEW_ALLOWED_PARENT_ORIGINS: `http://${HOST}:${PORT}`,
}
let printed = 0
const printer = setInterval(() => {
  for (const email of fakes.state.emails.slice(printed)) {
    console.log(`Email to ${email.to.join(", ")}: ${email.subject}\n${email.text.trim()}\n`)
  }
  printed = fakes.state.emails.length
}, 500)
let server: Bun.Subprocess | null = null
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => void cleanUp().then(() => process.exit(0)))
}

const db = new pg.Client({ connectionString: DATABASE_URL })
try {
  await db.connect()
  try {
    // Serialize demo startup through migration, the ownership check, and seeding.
    await db.query("select pg_advisory_lock(hashtext('swiftace-demo-seed'))")
    const reuse = await canReuseDemo()
    if (binary) {
      const migrated = Bun.spawnSync([binary, "migrate"], { env })
      if (migrated.exitCode !== 0)
        throw new Error(`swiftace migrate failed: ${migrated.stderr.toString()}`)
    }
    const images = await renderImages()
    await db.query("begin")
    try {
      await saveSettings(images)
      if (reuse) await refresh(images)
      else await seed(images)
      await db.query("commit")
    } catch (error) {
      await db.query("rollback")
      throw error
    }
    console.log(reuse ? "Reusing the demo content seeded before" : "Seeded the demo content")
  } finally {
    await db.end()
  }

  if (binary) {
    server = Bun.spawn([binary, "start"], {
      env,
      stdout: screenshotsDir ? "ignore" : "inherit",
      stderr: "inherit",
    })
    const base = `http://${HOST}:${PORT}`
    console.log(`\nDemo site: ${base}`)
    if (screenshotsDir) {
      await waitForServer(base)
      await takeScreenshots({
        base,
        dir: resolve(screenshotsDir),
        email: ADMIN.email,
        emails: () => fakes.state.emails,
      })
    }
  } else {
    console.log(
      `\nRun the dev server with these added to .env:\n${Object.entries(fakeServiceEnv(fakes.url))
        .map(([key, value]) => `${key}=${value}`)
        .join("\n")}`,
    )
  }
  if (!screenshotsDir) {
    console.log(
      `Sign in as ${ADMIN.email} (admin) or ${LEARNERS[0]!.email}; codes are printed below\n`,
    )
  }
} catch (error) {
  await cleanUp()
  throw error
}
if (screenshotsDir) await cleanUp()

async function cleanUp() {
  clearInterval(printer)
  server?.kill()
  await server?.exited
  await notebooks.stop(true)
  await fakes.stop()
}

/** An empty migrated database can already contain the authentication keys created by migrate. */
async function canReuseDemo() {
  const { rows: tables } = await db.query<{ name: string; identifier: string }>(
    `select tablename as name, format('%I.%I', schemaname, tablename) as identifier
     from pg_tables where schemaname = any(current_schemas(false))`,
  )
  if (tables.some((table) => table.name === "site_config")) {
    const marker = await db.query(
      "select 1 from site_config where section = $1 and data ? 'seededAt'",
      [DEMO_SECTION],
    )
    if (marker.rowCount) return true
  }
  for (const table of tables) {
    const config = table.name === "site_config"
    const result = await db.query(
      `select 1 from ${table.identifier} ${config ? "where section <> $1" : ""} limit 1`,
      config ? [AUTHENTICATION_CONFIG_SECTION] : [],
    )
    if (result.rowCount)
      throw new Error("DATABASE_URL contains data the demo didn't seed. Give it an empty database.")
  }
  return false
}

type DemoImages = Awaited<ReturnType<typeof renderImages>>

/** Renders can change across Chromium or font versions, so refresh the stored cover URLs too. */
async function refresh(images: DemoImages) {
  for (const course of COURSES) {
    await db.query(`update courses set cover = $1 where name = $2`, [
      `/assets/${images.covers.get(course.slug)}`,
      course.slug,
    ])
  }
  await db.query(
    `update course_sections set resources = $1 where slug = $2 and course_id = (select id from courses where name = $3)`,
    [notebookUrl, COURSES[0]!.sections.find((section) => section.notebook)!.slug, COURSES[0]!.slug],
  )
}

async function waitForServer(base: string) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (
      await fetch(base).then(
        (response) => response.ok,
        () => false,
      )
    )
      return
    await Bun.sleep(200)
  }
  throw new Error(`The demo site didn't answer at ${base}`)
}

/** Renders the covers and icon, and stores them in the fakes under content-hashed keys. */
async function renderImages() {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
    const covers = new Map<string, string>()
    for (const course of COURSES) {
      await page.setContent(coverHtml(course))
      covers.set(course.slug, store("course-images/", await page.screenshot()))
    }
    await page.setViewportSize({ width: 512, height: 512 })
    await page.setContent(ICON_HTML)
    const icon = await page.screenshot({ omitBackground: true })
    return { covers, icon: store("brand/icon-", icon), favicon: store("brand/favicon-", icon) }
  } finally {
    await browser.close()
  }
}

function store(prefix: string, png: Buffer): string {
  const key = `${prefix}${createHash("sha256").update(png).digest("hex").slice(0, 12)}.png`
  fakes.state.objects.set(`${BUCKET}/${key}`, {
    body: new Uint8Array(png),
    contentType: "image/png",
  })
  return key
}

/** The demo's settings, with its integrations pointed at this run's fakes. */
async function saveSettings(images: DemoImages) {
  const integrations = {
    email: {
      enabled: true,
      region: "us-east-1",
      accessKeyId: "fake",
      secretAccessKey: "fake",
      fromEmail: "notify@example.com",
    },
    objectStorage: {
      enabled: true,
      endpoint: fakes.url,
      region: "auto",
      accessKeyId: "fake",
      secretAccessKey: "fake",
      bucket: BUCKET,
    },
    openai: { enabled: true, apiKey: "sk-demo-fake" },
  }
  const branding = { icon: images.icon, favicon: images.favicon }
  const sections = { ...SITE, integrations, branding, aiTutor: { enabled: true } }
  for (const [section, data] of Object.entries(sections)) {
    await db.query(
      `insert into site_config (section, data) values ($1, $2)
       on conflict (section) do update set data = site_config.data || excluded.data`,
      [section, JSON.stringify(data)],
    )
  }
}

async function seed(images: DemoImages) {
  await db.query(`insert into site_config (section, data) values ($1, $2)`, [
    DEMO_SECTION,
    JSON.stringify({ seededAt: new Date().toISOString() }),
  ])
  const accountIds = new Map<string, number>()
  for (const [i, person] of [ADMIN, ...LEARNERS].entries()) {
    const { rows } = await db.query<{ id: number }>(
      `insert into accounts (created_at, updated_at, name, username, normalized_username, email, is_admin)
       values (now() - $5::int * interval '9 days', now(), $1, $2, $2, $3, $4) returning id`,
      [person.name, person.username, person.email, person === ADMIN, 60 - i],
    )
    accountIds.set(person.email, rows[0]!.id)
  }
  const adminId = accountIds.get(ADMIN.email)!

  for (const [position, course] of COURSES.entries()) {
    const { rows } = await db.query<{ id: number }>(
      `insert into courses (created_at, updated_at, owner_id, name, title, short_description, description,
         cover, published, visibility, offers_certificate, is_paid, sections, position)
       values (now(), now(), $1, $2, $3, $4, $5, $6, true, 'PUBLIC', true, $7, $8, $9) returning id`,
      [
        adminId,
        course.slug,
        course.title,
        course.shortDescription,
        course.description,
        `/assets/${images.covers.get(course.slug)}`,
        course.isPaid,
        JSON.stringify(course.sections.map((section) => section.slug)),
        position,
      ],
    )
    const courseId = rows[0]!.id
    const sectionIds: number[] = []
    for (const section of course.sections) {
      const { rows } = await db.query<{ id: number }>(
        `insert into course_sections (created_at, updated_at, course_id, slug, title, short_description,
           description, section_type, visibility, video_url, resources, always_open)
         values (now(), now(), $1, $2, $3, $4, $5, $6, 'PUBLIC', $7, $8, $9) returning id`,
        [
          courseId,
          section.slug,
          section.title,
          section.shortDescription || null,
          section.description ?? null,
          section.type,
          sectionVideo(section),
          section.notebook ? notebookUrl : null,
          section.alwaysOpen ?? false,
        ],
      )
      sectionIds.push(rows[0]!.id)
    }
    if (position > 0) continue

    const progress: [number, number][] = [
      [adminId, ADMIN_PROGRESS],
      ...LEARNERS.map((learner, i): [number, number] => [
        accountIds.get(learner.email)!,
        LEARNER_PROGRESS[i]!,
      ]),
    ]
    for (const [i, [accountId, done]] of progress.entries()) {
      await db.query(
        `insert into course_enrollments (created_at, updated_at, course_id, enrollee_id)
         values (now() - $3::int * interval '1 day', now(), $1, $2)`,
        [courseId, accountId, 3 + ((i * 17) % 60)],
      )
      for (const sectionId of sectionIds.slice(0, done)) {
        await db.query(
          `insert into course_section_progress (created_at, updated_at, section_id, enrollee_id, progress, completed_at)
           values (now(), now(), $1, $2, 100, now())`,
          [sectionId, accountId],
        )
      }
    }
    await seedConversation(courseId, adminId, course.sections, sectionIds)
  }
}

async function seedConversation(
  courseId: number,
  accountId: number,
  sections: { slug: string }[],
  sectionIds: number[],
) {
  const sectionId = sectionIds[sections.findIndex((s) => s.slug === TUTOR_CONVERSATION.sectionSlug)]
  const { rows } = await db.query<{ id: number }>(
    `insert into ai_tutor_conversations (created_at, updated_at, account_id, course_id, title)
     values (now(), now(), $1, $2, $3) returning id`,
    [accountId, courseId, TUTOR_CONVERSATION.title],
  )
  for (const message of TUTOR_CONVERSATION.messages) {
    await db.query(
      `insert into ai_tutor_messages (created_at, conversation_id, role, parts, section_id, status)
       values (clock_timestamp(), $1, $2, $3, $4, $5)`,
      [
        rows[0]!.id,
        message.role,
        JSON.stringify([{ type: "text", content: message.text }]),
        sectionId,
        message.role === "assistant" ? "complete" : null,
      ],
    )
  }
}
