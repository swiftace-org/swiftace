import { createFileRoute } from "@tanstack/react-router"

import { getSiteUrl } from "@/lib/utils.server"

import { CRAWLER_FILE_CACHE_CONTROL } from "./-lib/constants"
import {
  readCachedCrawlerFile,
  readPublicCourseOutlines,
  readPublicStaticPages,
} from "./-lib/utils.server"

/** Well under the 50,000-URL limit of a single sitemap (about 50 today), so no index file. */
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const origin = getSiteUrl()
        try {
          const xml = await readCachedCrawlerFile(`sitemap:${origin}`, () => buildSitemap(origin))
          return new Response(xml, {
            headers: {
              "Content-Type": "application/xml; charset=utf-8",
              "Cache-Control": CRAWLER_FILE_CACHE_CONTROL,
            },
          })
        } catch (error) {
          console.error("Failed to build the sitemap.", error)
          return new Response("Sitemap unavailable", { status: 503 })
        }
      },
    },
  },
})

type SitemapEntry = { path: string; lastModified?: Date }

async function buildSitemap(origin: string): Promise<string> {
  const [courses, staticPages] = await Promise.all([
    readPublicCourseOutlines(),
    readPublicStaticPages(),
  ])
  const newest = courses.reduce<Date | undefined>(
    (latest, course) => (!latest || course.lastModified > latest ? course.lastModified : latest),
    undefined,
  )

  const entries: SitemapEntry[] = [
    { path: "/", lastModified: newest },
    ...staticPages.map(({ path }) => ({ path })),
    ...courses.flatMap((course) => [
      { path: course.path, lastModified: course.lastModified },
      ...course.sections,
    ]),
  ]

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...entries.map((entry) => {
      const lastmod = entry.lastModified
        ? `<lastmod>${entry.lastModified.toISOString()}</lastmod>`
        : ""
      return `  <url><loc>${escapeXml(`${origin}${entry.path}`)}</loc>${lastmod}</url>`
    }),
    `</urlset>`,
    "",
  ].join("\n")
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}
