import { createFileRoute } from "@tanstack/react-router"

import { getSiteConfig, getSiteUrl } from "@/lib/utils.server"

import { toSubscriptionPlanName } from "./(billing)/-lib/utils"
import { CRAWLER_FILE_CACHE_CONTROL } from "./-lib/constants"
import {
  readCachedCrawlerFile,
  readPublicCourseOutlines,
  readPublicStaticPages,
} from "./-lib/utils.server"

/** The llmstxt.org format: a markdown map of the site for language models, built from the sitemap's data. */
export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async () => {
        const origin = getSiteUrl()
        try {
          const text = await readCachedCrawlerFile(`llms:${origin}`, () => buildLlmsTxt(origin))
          return new Response(text, {
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": CRAWLER_FILE_CACHE_CONTROL,
            },
          })
        } catch (error) {
          console.error("Failed to build llms.txt.", error)
          return new Response("llms.txt unavailable", { status: 503 })
        }
      },
    },
  },
})

async function buildLlmsTxt(origin: string): Promise<string> {
  const [courses, staticPages, config] = await Promise.all([
    readPublicCourseOutlines(),
    readPublicStaticPages(),
    getSiteConfig(),
  ])
  const { general, integrations } = config
  const paidCourses = integrations.billing.enabled
    ? `paid courses preview a few lessons and unlock fully with a ${toSubscriptionPlanName(config)} subscription`
    : "paid courses preview a few lessons"
  const link = (title: string, path: string, note?: string | null) =>
    `- [${escapeLinkText(title)}](${origin}${path})${note ? `: ${note}` : ""}`

  return [
    `# ${general.siteName}`,
    "",
    `> ${general.description}`,
    "",
    `Each course is a sequence of lessons (a video plus a Jupyter notebook, sometimes with practice questions) and assignments. Free courses are open to everyone; ${paidCourses}. Only the lessons readable without signing in are listed here.`,
    "",
    "## Courses",
    "",
    ...courses.map((course) => link(course.title, course.path, course.description)),
    ...courses.flatMap((course) =>
      course.sections.length
        ? [
            "",
            `## ${course.title}`,
            "",
            ...course.sections.map((section) => link(section.title, section.path)),
          ]
        : [],
    ),
    "",
    "## Optional",
    "",
    ...staticPages.map((page) => link(page.title, page.path)),
    "",
  ].join("\n")
}

function escapeLinkText(value: string): string {
  return value.replace(/[[\]]/g, "\\$&")
}
