import { describe, expect, it } from "vite-plus/test"

import { configureSites, type Sites } from "./caddyfile"

const SITES: Sites = {
  domain: "example.com",
  redirectDomains: ["www.example.com"],
  previewDomain: "preview.example.com",
  port: 4000,
  previewPort: 4100,
}

function configure(existing: string, sites: Sites = SITES) {
  const result = configureSites(existing, sites)
  if (!result.ok) throw new Error(result.error)
  return result
}

// A site with custom rules, like a production one: only the upstreams may change.
const CUSTOM = `# Global options
{
	email admin@example.com
}

(legacy) {
	reverse_proxy localhost:3000
}

example.com {
	encode zstd gzip

	@learn path /learn /learn/*
	handle @learn {
		@course path_regexp course ^/learn/([^/]+)
		route {
			rewrite @course /course/{re.course.1}
			redir * {uri} permanent
		}
	}

	handle @old {
		reverse_proxy localhost:4000 { # with a comment
			@notFound status 404
			handle_response @notFound {
				redir https://old.example.com{uri}
			}
		}
	}

	handle {
		reverse_proxy localhost:4000
	}
}

www.example.com {
	redir https://example.com{uri} permanent
}

old.example.com {
	import legacy
}

preview.example.com {
	encode zstd gzip
	reverse_proxy 127.0.0.1:3100 {
		header_up -Cookie
		header_down -Set-Cookie
	}
}
`

describe("configureSites", () => {
  it("changes only the upstreams of existing blocks, keeping their custom rules", () => {
    const result = configure(CUSTOM)
    expect(result.caddyfile).toBe(
      CUSTOM.replace(
        "reverse_proxy localhost:4000 { # with a comment",
        "reverse_proxy 127.0.0.1:4000 { # with a comment",
      )
        .replace("\t\treverse_proxy localhost:4000\n", "\t\treverse_proxy 127.0.0.1:4000\n")
        .replace("reverse_proxy 127.0.0.1:3100 {", "reverse_proxy 127.0.0.1:4100 {"),
    )
    expect(result.caddyfile).toContain("\treverse_proxy localhost:3000\n")
    expect(result.warnings).toEqual([])
    expect(result.changes).toEqual([
      "example.com: pointed 2 reverse_proxy at 127.0.0.1:4000",
      "www.example.com: left as it is",
      "preview.example.com: pointed 1 reverse_proxy at 127.0.0.1:4100",
    ])
  })

  it("is the same when run again", () => {
    const once = configure(CUSTOM).caddyfile
    expect(configure(once).caddyfile).toBe(once)
  })

  it("appends blocks for domains it doesn't have, leaving the rest alone", () => {
    const existing = "other.org {\n\treverse_proxy localhost:8080\n}\n"
    expect(configure(existing, { ...SITES, previewDomain: undefined }).caddyfile).toBe(
      `${existing}
example.com {
	encode zstd gzip
	reverse_proxy 127.0.0.1:4000
}

www.example.com {
	redir https://example.com{uri} permanent
}
`,
    )
  })

  it("adds a permanent redirect for each redirect domain", () => {
    const result = configure("", {
      ...SITES,
      redirectDomains: ["www.example.com", "example.org"],
      previewDomain: undefined,
    })
    expect(result.caddyfile).toContain(
      "www.example.com {\n\tredir https://example.com{uri} permanent\n}\n",
    )
    expect(result.caddyfile).toContain(
      "example.org {\n\tredir https://example.com{uri} permanent\n}\n",
    )
  })

  it("adds a preview block that strips cookies both ways", () => {
    const result = configure("example.com {\n\treverse_proxy localhost:4000\n}\n", {
      ...SITES,
      redirectDomains: [],
    })
    expect(result.caddyfile).toContain(`preview.example.com {
	encode zstd gzip

	# The notebook preview reads no cookies, and the site's may arrive with every request.
	reverse_proxy 127.0.0.1:4100 {
		header_up -Cookie
		header_down -Set-Cookie
	}
}
`)
  })

  it("warns about an existing preview block that lets cookies through", () => {
    const result = configure("preview.example.com {\n\treverse_proxy localhost:3100\n}\n")
    expect(result.caddyfile).toContain("\treverse_proxy 127.0.0.1:4100\n")
    expect(result.warnings).toEqual([expect.stringMatching(/doesn't strip cookies/)])
  })

  it("handles addresses across lines and in any form, matchers and `to` upstreams", () => {
    const existing = `https://Example.com:443,
  http://example.com {
	reverse_proxy /api/* localhost:4000 localhost:4001
	reverse_proxy {
		to localhost:4000 localhost:4001 # two
		lb_policy first
	}
}
`
    const result = configure(existing, { ...SITES, redirectDomains: [], previewDomain: undefined })
    expect(result.caddyfile).toBe(`https://Example.com:443,
  http://example.com {
	reverse_proxy /api/* 127.0.0.1:4000
	reverse_proxy {
		to 127.0.0.1:4000 # two
		lb_policy first
	}
}
`)
  })

  it("refuses a block whose proxies go to different places", () => {
    const result = configureSites(
      "example.com {\n\treverse_proxy /api/* localhost:8080\n\treverse_proxy localhost:4000\n}\n",
      SITES,
    )
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/more than one place/) })
  })

  it("refuses a block serving both the site and the preview", () => {
    const result = configureSites(
      "example.com, preview.example.com {\n\treverse_proxy localhost:4000\n}\n",
      SITES,
    )
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/different ports/) })
  })

  it("refuses unbalanced braces", () => {
    expect(configureSites("example.com {\n\treverse_proxy x\n", SITES)).toEqual({
      ok: false,
      error: expect.stringMatching(/Unbalanced/),
    })
  })
})
