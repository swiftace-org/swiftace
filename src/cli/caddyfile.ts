// Edits a Caddyfile for `swiftace deploy`. A domain that already has a site block keeps it, with
// only its `reverse_proxy` upstreams pointed at the app, so custom rules (redirects, rewrites,
// headers) survive. A domain without one gets a new block appended. Nothing else is touched.

export type Sites = {
  /** The site's domain, which is proxied to the app. */
  domain: string
  /** Domains that redirect to it permanently. */
  redirectDomains: readonly string[]
  /** The notebook preview's domain, proxied to the preview server without cookies. */
  previewDomain?: string
  port: number
  previewPort: number
}

export type CaddyfileResult =
  | { ok: true; caddyfile: string; changes: string[]; warnings: string[] }
  | { ok: false; error: string }

type Block = { start: number; end: number; hosts: string[] }
type Want = { domain: string; role: "site" | "redirect" | "preview"; port: number }

export function configureSites(caddyfile: string, sites: Sites): CaddyfileResult {
  const wants = [
    { domain: sites.domain, role: "site" as const, port: sites.port },
    ...sites.redirectDomains.map((domain) => ({
      domain,
      role: "redirect" as const,
      port: sites.port,
    })),
    ...(sites.previewDomain
      ? [{ domain: sites.previewDomain, role: "preview" as const, port: sites.previewPort }]
      : []),
  ].map((want): Want => ({ ...want, domain: want.domain.toLowerCase() }))

  const lines = caddyfile.split("\n")
  const blocks = siteBlocks(lines)
  if (!blocks.ok) return blocks
  const changes: string[] = []
  const warnings: string[] = []
  const missing: Want[] = []
  // Which want each block is edited for, so one block can't be asked for two ports.
  const edits = new Map<Block, Want>()

  for (const want of wants) {
    const matched = blocks.blocks.filter((block) => block.hosts.includes(want.domain))
    if (!matched.length) missing.push(want)
    for (const block of matched) {
      const other = edits.get(block)
      if (other && other.port !== want.port) {
        return {
          ok: false,
          error: `One site block serves both ${other.domain} and ${want.domain}, which need different ports. Edit it by hand.`,
        }
      }
      if (!other || want.role !== "redirect") edits.set(block, want)
    }
  }

  for (const [block, want] of edits) {
    const edited = pointReverseProxies(lines, block, `127.0.0.1:${want.port}`)
    if (!edited.ok) return edited
    const name = block.hosts.join(", ")
    if (edited.count) {
      changes.push(`${name}: pointed ${edited.count} reverse_proxy at 127.0.0.1:${want.port}`)
    } else if (want.role === "redirect") {
      changes.push(`${name}: left as it is`)
    } else {
      warnings.push(
        `${name} has no reverse_proxy of its own to point at 127.0.0.1:${want.port}; check it routes there.`,
      )
    }
    const body = lines.slice(block.start, block.end + 1).join("\n")
    const stripsCookies =
      /^\s*header_up\s+-Cookie\b/im.test(body) && /^\s*header_down\s+-Set-Cookie\b/im.test(body)
    if (want.role === "preview" && !stripsCookies) {
      warnings.push(
        `${name} doesn't strip cookies: add "header_up -Cookie" and "header_down -Set-Cookie" to its reverse_proxy.`,
      )
    }
  }

  const appended = missing.map((want) => {
    changes.push(`${want.domain}: added a site block`)
    return newBlock(want, sites.domain)
  })
  let output = lines.join("\n")
  if (appended.length) output = `${output.replace(/\s*$/, "")}\n\n${appended.join("\n")}`
  if (!output.endsWith("\n")) output += "\n"
  return { ok: true, caddyfile: output.replace(/^\n+/, ""), changes, warnings }
}

function newBlock(want: Want, siteDomain: string): string {
  if (want.role === "redirect") {
    return `${want.domain} {\n\tredir https://${siteDomain}{uri} permanent\n}\n`
  }
  if (want.role === "preview") {
    return (
      `${want.domain} {\n\tencode zstd gzip\n\n` +
      "\t# The notebook preview reads no cookies, and the site's may arrive with every request.\n" +
      `\treverse_proxy 127.0.0.1:${want.port} {\n\t\theader_up -Cookie\n\t\theader_down -Set-Cookie\n\t}\n}\n`
    )
  }
  return `${want.domain} {\n\tencode zstd gzip\n\treverse_proxy 127.0.0.1:${want.port}\n}\n`
}

/**
 * The top-level site blocks, with the hosts of their addresses, which may span lines ending in
 * commas. Global options, snippets and named routes aren't sites, so they're left out.
 */
function siteBlocks(lines: string[]): { ok: true; blocks: Block[] } | { ok: false; error: string } {
  const blocks: Block[] = []
  let depth = 0
  let pending: { start: number; addresses: string } | null = null
  let open: { start: number; hosts: string[] } | null = null

  for (const [i, line] of lines.entries()) {
    const code = withoutComment(line)
    const change = count(code, "{") - count(code, "}")
    if (depth > 0) {
      depth += change
      if (depth < 0) return { ok: false, error: `Unbalanced braces on line ${i + 1}` }
      if (depth === 0 && open) {
        blocks.push({ ...open, end: i })
        open = null
      }
      continue
    }
    if (!code.trim() && !pending) continue
    pending ??= { start: i, addresses: "" }
    pending.addresses += ` ${code}`
    if (/,\s*$/.test(code)) continue
    if (!code.includes("{")) {
      // A site with no block is a single-line site, like `example.com` alone; nothing to edit.
      pending = null
      continue
    }
    const addresses = pending.addresses
      .slice(0, pending.addresses.indexOf("{"))
      .split(/[\s,]+/)
      .filter(Boolean)
    const isSite = addresses.length > 0 && !addresses.some((address) => /^&?\(/.test(address))
    depth = change
    if (depth < 0) return { ok: false, error: `Unbalanced braces on line ${i + 1}` }
    if (isSite) {
      const hosts = addresses.map(host)
      if (depth === 0) blocks.push({ start: pending.start, end: i, hosts })
      else open = { start: pending.start, hosts }
    }
    pending = null
  }
  if (depth !== 0) return { ok: false, error: "Unbalanced braces: a block isn't closed" }
  return { ok: true, blocks }
}

/**
 * Points each `reverse_proxy` in a block at one upstream, keeping its matcher, options and
 * comment. A block whose proxies go to different places (say, an API and the app) is refused
 * rather than guessed at.
 */
function pointReverseProxies(
  lines: string[],
  block: Block,
  upstream: string,
): { ok: true; count: number } | { ok: false; error: string } {
  const edits: { line: number; text: string; upstreams: string[] }[] = []
  for (let i = block.start; i <= block.end; i++) {
    const code = withoutComment(lines[i]!)
    const match = /^(\s*)reverse_proxy(\s.*)?$/.exec(code)
    if (!match || i === block.start) continue
    const prefix = match[1]!
    const rest = match[2] ?? ""
    const opens = /\{\s*$/.test(rest)
    const args = rest
      .replace(/\{\s*$/, "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
    const matcher = args[0] && /^(@|\/|\*$)/.test(args[0]) ? [args[0]] : []
    const upstreams = args.slice(matcher.length)
    const comment = lines[i]!.slice(code.length)

    if (upstreams.length) {
      const text = [`${prefix}reverse_proxy`, ...matcher, upstream].join(" ")
      edits.push({ line: i, text: `${text}${opens ? " {" : ""}${comment}`, upstreams })
      continue
    }
    if (!opens) {
      return {
        ok: false,
        error: `reverse_proxy on line ${i + 1} has no upstream. Edit it by hand.`,
      }
    }
    // The upstreams are in its block, as `to` lines.
    const to = toLines(lines, i)
    if (to.length !== 1) {
      return {
        ok: false,
        error: `reverse_proxy on line ${i + 1} has ${to.length} "to" lines. Edit it by hand.`,
      }
    }
    const [line] = to
    const original = lines[line!]!
    const toCode = withoutComment(original)
    const indent = /^\s*/.exec(toCode)![0]
    edits.push({
      line: line!,
      text: `${indent}to ${upstream}${original.slice(toCode.length)}`,
      upstreams: toCode.trim().split(/\s+/).slice(1),
    })
  }

  const targets = new Set(edits.map((edit) => edit.upstreams.map(normalizeUpstream).join(" ")))
  if (targets.size > 1) {
    return {
      ok: false,
      error: `The ${block.hosts.join(", ")} block proxies to more than one place (${[...targets].join("; ")}), so it can't tell which is the app. Edit it by hand.`,
    }
  }
  for (const edit of edits) lines[edit.line] = edit.text
  return { ok: true, count: edits.length }
}

/** The `to` lines directly inside the reverse_proxy block that opens on a line. */
function toLines(lines: string[], opening: number): number[] {
  const found: number[] = []
  let depth = 1
  for (let i = opening + 1; i < lines.length && depth > 0; i++) {
    const code = withoutComment(lines[i]!)
    if (depth === 1 && /^\s*to\s+\S/.test(code)) found.push(i)
    depth += count(code, "{") - count(code, "}")
  }
  return found
}

/** Loopback upstreams written differently are the same place. */
function normalizeUpstream(upstream: string): string {
  return upstream
    .replace(/^https?:\/\//i, "")
    .replace(/^(localhost|\[::1\])(?=:|$)/i, "127.0.0.1")
    .toLowerCase()
}

function withoutComment(line: string): string {
  return /^\s*#/.test(line) ? "" : line.replace(/\s#.*$/, "")
}

function count(text: string, char: string): number {
  return text.split(char).length - 1
}

/** The host of a site address, like example.com in https://example.com:443/path. */
function host(address: string): string {
  return address
    .replace(/^[a-z]+:\/\//i, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .toLowerCase()
}
