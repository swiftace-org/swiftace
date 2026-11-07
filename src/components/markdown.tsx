import parse, {
  attributesToProps,
  domToReact,
  Element,
  type HTMLReactParserOptions,
} from "html-react-parser"

import { BlueLink } from "@/components/blue-link"
import { cn } from "@/lib/utils"

type MarkdownProps = {
  /** Pre-rendered HTML markup produced by `renderMarkdown` on the server. */
  markup: string
  className?: string
}

const options: HTMLReactParserOptions = {
  replace: (domNode) => {
    if (!(domNode instanceof Element)) return

    if (domNode.name === "a") {
      const href = domNode.attribs.href
      // Heading autolinks (rehype-autolink-headings wraps the whole heading) and in-page
      // anchors must keep the surrounding text's color instead of reading as links.
      if (href?.startsWith("#")) {
        return (
          <a {...attributesToProps(domNode.attribs)}>
            {domToReact(domNode.children as never, options)}
          </a>
        )
      }
      // Internal links use the router so navigation stays client-side.
      if (href?.startsWith("/")) {
        return (
          <BlueLink to={href} colored>
            {domToReact(domNode.children as never, options)}
          </BlueLink>
        )
      }
      return (
        <BlueLink
          external
          colored
          {...attributesToProps(domNode.attribs)}
          target="_blank"
          rel="noreferrer"
        >
          {domToReact(domNode.children as never, options)}
        </BlueLink>
      )
    }

    if (domNode.name === "img") {
      // attributesToProps converts raw HTML attribs (e.g. a `style` string) into
      // valid React props — spreading domNode.attribs directly crashes React
      // when the source HTML has an inline style attribute.
      return (
        <img
          {...attributesToProps(domNode.attribs)}
          loading="lazy"
          className="rounded-lg"
          alt={domNode.attribs.alt ?? ""}
        />
      )
    }

    // Only reaches here from `renderMarkdown({ embeds: true })`, which has already vetted `src`.
    if (domNode.name === "iframe") {
      return (
        <div className="not-prose my-6 aspect-video w-full overflow-hidden rounded-lg border bg-muted">
          <iframe
            src={domNode.attribs.src}
            title={domNode.attribs.title || "Embedded content"}
            className="size-full"
            loading="lazy"
            allowFullScreen
            // Safe only because `src` is a third-party player, never our own origin.
            // oxlint-disable-next-line react/iframe-missing-sandbox
            sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
          />
        </div>
      )
    }
  },
}

export function Markdown({ markup, className }: MarkdownProps) {
  return (
    <div className={cn("prose dark:prose-invert max-w-none prose-a:no-underline", className)}>
      {parse(markup, options)}
    </div>
  )
}
