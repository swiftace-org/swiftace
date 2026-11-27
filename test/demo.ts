// Runs a demo site with realistic content against the fake services, for trying SwiftAce out,
// testing by hand and taking screenshots. It needs a database it may fill: an empty one is seeded
// with test/demo-data.ts, and a seeded one is reused. Images live in the fakes, so they're
// uploaded again on every run.
//
//   DATABASE_URL=postgres://… bun test/demo.ts [dist/swiftace]
//
// With a binary, it migrates and runs it on PORT (4000). Without one, it seeds the database
// `vp run dev` uses and prints the environment to run it with. Sign in as admin@example.com or
// any learner: the emailed codes are printed here. Chromium renders the images, as in
// test/integration.ts.
import { createHash } from "node:crypto"
import { resolve } from "node:path"

import pg from "pg"
import { chromium } from "playwright"

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
import { fakeServiceEnv, startFakeServices } from "./fake-services.ts"

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) throw new Error("Set DATABASE_URL to a database the demo may fill")
const binary = process.argv[2] ? resolve(process.argv[2]) : null
const PORT = Number(process.env.PORT ?? 4000)
const HOST = process.env.HOST ?? "127.0.0.1"
const BUCKET = "swiftace-demo"

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
if (binary) {
  const migrated = Bun.spawnSync([binary, "migrate"], { env })
  if (migrated.exitCode !== 0)
    throw new Error(`swiftace migrate failed: ${migrated.stderr.toString()}`)
}

const db = new pg.Client({ connectionString: DATABASE_URL })
await db.connect()
const images = await renderImages()
await saveSettings()
const { rows } = await db.query("select count(*)::int as count from courses")
if (rows[0].count === 0) {
  await seed()
  console.log("Seeded the demo content")
} else {
  console.log("Courses exist already, so the demo content wasn't seeded")
}
await db.end()

let server: Bun.Subprocess | null = null
if (binary) {
  server = Bun.spawn([binary, "start"], { env, stdout: "inherit", stderr: "inherit" })
  console.log(`\nDemo site: http://${HOST}:${PORT}`)
} else {
  console.log(
    `\nRun the dev server with these added to .env:\n${Object.entries(fakeServiceEnv(fakes.url))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n")}`,
  )
}
console.log(`Sign in as ${ADMIN.email} (admin) or ${LEARNERS[0]!.email}; codes are printed below\n`)

let printed = 0
const printer = setInterval(() => {
  for (const email of fakes.state.emails.slice(printed)) {
    console.log(`Email to ${email.to.join(", ")}: ${email.subject}\n${email.text.trim()}\n`)
  }
  printed = fakes.state.emails.length
}, 500)

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    clearInterval(printer)
    server?.kill()
    await server?.exited
    await notebooks.stop(true)
    await fakes.stop()
    process.exit(0)
  })
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

/** Points the integrations at this run's fakes, so they're refreshed even on a seeded database. */
async function saveSettings() {
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

async function seed() {
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
