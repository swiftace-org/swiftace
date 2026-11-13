import crypto from "node:crypto"

import { GetObjectCommand, NoSuchKey, PutObjectCommand } from "@aws-sdk/client-s3"
import type { Element, Root } from "hast"
import { toString } from "hast-util-to-string"
import rehypeAutolinkHeadings from "rehype-autolink-headings"
import rehypeKatex from "rehype-katex"
import rehypeRaw from "rehype-raw"
import rehypeSanitize, { defaultSchema, type Options as SanitizeSchema } from "rehype-sanitize"
import rehypeSlug from "rehype-slug"
import rehypeStringify from "rehype-stringify"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import { unified } from "unified"
import { SKIP, visit } from "unist-util-visit"

import { getObjectStorage } from "@/lib/utils.server"
import type { SubmissionField, SubmissionRequirement } from "@/types/assignment"

import { BRAND_IMAGE_CONTENT_TYPES } from "../../brand/-lib/constants"
import { COURSE_IMAGE_KEY_PATTERN, type CourseImageType, EMBED_URL_PREFIXES } from "./constants"
import { toSubmissionFields } from "./utils"

/**
 * What raw HTML embedded in markdown may contain. `rehypeRaw` keeps *everything*, including
 * `<script>` and `<iframe>`, and not all of this content is admin-authored — assignment answers
 * are rendered as markdown on the evaluation page, so an enrollee could otherwise run script in
 * an admin's session. Base is GitHub's schema, with three deliberate widenings:
 */
const sanitizeSchema: SanitizeSchema = {
  ...defaultSchema,
  protocols: {
    ...defaultSchema.protocols,
    // Notebook markdown cells inline their figures as base64. A `data:` URI in `<img src>`
    // can't execute script — even an SVG one, because browsers load images in a mode that
    // ignores it — and `img` is the only allowed tag whose `src` this reaches.
    src: [...(defaultSchema.protocols?.src ?? []), "data"],
  },
  attributes: {
    ...defaultSchema.attributes,
    // Restricted to a fixed set of values, so neither can carry a URL.
    a: [
      ...(defaultSchema.attributes?.a ?? []),
      ["target", "_blank", "_self"],
      ["rel", "noreferrer", "noopener", "nofollow"],
    ],
  },
  // `defaultSchema` prefixes every `id`/`name` with `user-content-` to stop content from
  // clobbering DOM globals. `remark-gfm` already applies that prefix to the footnote ids it
  // generates, so leaving it on prefixes them twice and breaks every footnote link — the
  // anchors move but the `href`s pointing at them don't. Turning it off gives up clobber
  // protection for ids written by hand in raw HTML; nothing in this app resolves an element
  // by a content-supplied id, and the tags that make clobbering exploitable are gone anyway.
  clobberPrefix: "",
}

/** Lets `<iframe>` through for admin-authored content; `rehypeEmbedAllowlist` then vets each `src`. */
const embedSanitizeSchema: SanitizeSchema = {
  ...sanitizeSchema,
  tagNames: [...(sanitizeSchema.tagNames ?? []), "iframe"],
  attributes: { ...sanitizeSchema.attributes, iframe: ["src", "title"] },
}

export type MarkdownHeading = {
  id: string
  text: string
  level: number
}

export type MarkdownResult = {
  markup: string
  headings: MarkdownHeading[]
}

/**
 * `math` turns `$...$` and `$$...$$` into KaTeX. Only notebook markdown opts in, as in Jupyter:
 * elsewhere a pair of prices like "$49 or $99" would be typeset as an equation.
 *
 * `embeds` keeps iframes pointing at `EMBED_URL_PREFIXES` (slide decks). Only content an admin
 * wrote may opt in — never a learner's submission, which renders on the admin evaluation page.
 */
export async function renderMarkdown(
  content: string,
  { math = false, embeds = false }: { math?: boolean; embeds?: boolean } = {},
): Promise<MarkdownResult> {
  const headings: MarkdownHeading[] = []

  const result = await unified()
    .use(remarkParse) // Parse markdown
    .use(remarkGfm) // Support GitHub Flavored Markdown
    .use(math ? [remarkMath] : [])
    .use(remarkRehype, { allowDangerousHtml: true }) // Convert to HTML AST
    .use(rehypeRaw) // Process raw HTML in markdown
    .use(rehypeSanitize, embeds ? embedSanitizeSchema : sanitizeSchema) // Strip anything unsafe the raw HTML brought with it
    .use(embeds ? [rehypeEmbedAllowlist] : [])
    // Everything below runs after sanitizing, so the ids and classes these add are ours
    // rather than the content's, and survive untouched.
    // The sanitizer keeps math as `code.language-math`, which is all rehype-katex needs, and
    // KaTeX's own markup can't carry script while its `trust` option stays off.
    .use(math ? [rehypeKatex] : [])
    .use(rehypeSlug) // Add IDs to headings
    .use(rehypeAutolinkHeadings, {
      behavior: "wrap",
      properties: { className: ["anchor"] },
    })
    .use(() => (tree) => {
      // Extract headings for table of contents
      visit(tree, "element", (node: Element) => {
        if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(node.tagName)) {
          headings.push({
            id: typeof node.properties?.id === "string" ? node.properties.id : "",
            text: toString(node),
            level: parseInt(node.tagName.charAt(1), 10),
          })
        }
      })
    })
    .use(rehypeStringify) // Serialize to HTML string
    .process(content)

  return {
    markup: String(result),
    headings,
  }
}

/** Drops every iframe whose `src` isn't an https URL under one of `EMBED_URL_PREFIXES`. */
function rehypeEmbedAllowlist() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element, index, parent) => {
      if (node.tagName !== "iframe" || !parent || index === undefined) return
      if (isAllowedEmbedUrl(node.properties.src)) return
      parent.children.splice(index, 1)
      return [SKIP, index]
    })
  }
}

function isAllowedEmbedUrl(src: unknown) {
  if (typeof src !== "string" || !URL.canParse(src)) return false
  const url = new URL(src)
  return EMBED_URL_PREFIXES.some((prefix) => `${url.origin}${url.pathname}`.startsWith(prefix))
}

/**
 * A submission's answers, resolved into the titled fields the evaluation table and the enrollee's
 * history both render. Only fields the assignment declares as markdown are rendered; most answers
 * are a single URL.
 */
export function toRenderedSubmissionFields(
  answers: unknown,
  requirements: SubmissionRequirement[],
): Promise<SubmissionField[]> {
  return Promise.all(
    toSubmissionFields(answers, requirements).map(async (field) => ({
      id: field.id,
      title: field.title,
      value: field.value,
      html: field.isMarkdown ? (await renderMarkdown(field.value)).markup : null,
    })),
  )
}

/**
 * Where uploaded course images go, as `course-images/<hash>.<ext>`. The hash is of the content, so
 * a key never changes what it serves and can be cached for good.
 */
export async function uploadCourseImage(body: Uint8Array, type: CourseImageType): Promise<string> {
  const hash = crypto.createHash("sha256").update(body).digest("hex").slice(0, 12)
  const key = `course-images/${hash}.${type}`
  const { client, bucket } = await getObjectStorage()
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: BRAND_IMAGE_CONTENT_TYPES[type],
    }),
  )
  return key
}

export async function readCourseImage(key: string) {
  if (!COURSE_IMAGE_KEY_PATTERN.test(key)) return null
  return readR2Object(key)
}

/**
 * An image the legacy course editor uploaded. The slug is the one the course had at upload time and
 * is part of the R2 key, so the path keeps working after the course is renamed.
 */
export async function readLegacyCourseImage(courseSlug: string, hash: string, filename: string) {
  return readR2Object(`assets/course/${courseSlug}/images/${hash}/${filename}`)
}

async function readR2Object(key: string) {
  try {
    const { client, bucket } = await getObjectStorage()
    return await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
  } catch (error) {
    if (error instanceof NoSuchKey) return null
    throw error
  }
}
