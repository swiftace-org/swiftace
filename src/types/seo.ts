/** A schema.org node, emitted as `application/ld+json` through a route's `head()`. */
export type JsonLd = { [key: string]: JsonLdValue }

type JsonLdValue = string | number | boolean | null | JsonLd | JsonLdValue[]

/** What a public page tells search engines and link previews about itself. */
export type PageSeo = {
  /** Without the site name — `toPageHead` appends it. */
  title: string
  description?: string | null
  /** Site-relative, e.g. `/course/abc`; made absolute against the origin serving the page. */
  path: string
  image?: string | null
  type?: "website" | "article"
  noindex?: boolean
  jsonLd?: JsonLd[]
}
