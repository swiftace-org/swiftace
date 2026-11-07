# SwiftAce

An open-source course platform: courses of video lessons, Jupyter notebooks, quizzes and graded
assignments, with certificates, an AI tutor and optional Stripe subscriptions. It ships as a single
binary that serves the site and its notebook preview, with its data in Postgres.

Everything specific to a site (its name, images, copy, legal pages and integrations) is set by an
admin at `/manage/config`, so there's nothing to change in code to run your own.

## Install

SwiftAce runs on Linux and macOS (x64 and arm64). This downloads the binary for your machine from
the [latest release](https://github.com/swiftace-org/swiftace/releases/latest), checks it against
the release's `SHA256SUMS` and installs it as `/usr/local/bin/swiftace`, with sudo if needed:

```sh
curl -fsSL https://github.com/swiftace-org/swiftace/releases/latest/download/install.sh | sh
```

Running it again upgrades. `SWIFTACE_VERSION=0.1.2` before `sh` installs a given release, and
`SWIFTACE_INSTALL_DIR=~/bin` installs somewhere else. Or download
`swiftace-<linux|darwin>-<x64|arm64>` from the release yourself and check it with
`sha256sum --check --ignore-missing SHA256SUMS`.

It needs a Postgres database, Amazon SES to send email, and an S3-compatible bucket such as
Cloudflare R2 for uploads and certificates.

### On a server

On a Linux server with [Caddy](https://caddyserver.com/docs/install) installed and DNS for your
domains pointing at it, run as root:

```sh
sudo swiftace deploy example.com www.example.com --preview-domain preview.example.com
```

The first domain is the site; any others redirect to it. `deploy`:

1. installs the binary as `/usr/local/bin/swiftace`, if it was run from elsewhere
2. creates `/etc/swiftace.env`, readable only by root, with every variable the server needs and
   new `JWT_SECRET_KEY` and `HASH_SECRET_KEY`. It stops there until you fill in the rest, then
   you run it again. It never overwrites a value that's already set
3. installs `swiftace.service`, a locked-down systemd service listening on `127.0.0.1`
4. applies any database migrations, stopping before anything restarts if they fail
5. restarts the service and checks it answers
6. edits `/etc/caddy/Caddyfile`, which it never creates. A domain that already has a site block
   keeps it, with only its `reverse_proxy` upstreams pointed at SwiftAce, so custom rules
   survive; a domain without one gets a new block. The result is checked with `caddy validate`
   before it replaces the live file, and the old one is put back if Caddy won't reload it

The domains are saved, so later runs can leave them out. Then sign up on the site and make
yourself an admin:

```sh
sudo swiftace make-admin you@example.com
```

To upgrade, `sudo swiftace upgrade`, then `sudo swiftace deploy` to migrate and restart.

## Command line

| Command                                                        | What it does                                                                                             |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `swiftace`, `swiftace start`                                   | Runs the site on `PORT` and the notebook preview on `PREVIEW_PORT`. Refuses to if migrations are pending |
| `swiftace migrate [--dry-run]`                                 | Applies the database migrations that haven't run yet, or lists them                                      |
| `swiftace make-admin <email>`                                  | Makes an existing account an admin                                                                       |
| `swiftace upgrade [version] [-y]`                              | Replaces the binary with the latest release, or the given one, checked against its `SHA256SUMS`          |
| `swiftace deploy <domain> [redirects…] [--preview-domain <d>]` | Installs SwiftAce as a service behind Caddy (as root, on Linux)                                          |
| `swiftace version`, `swiftace help`                            | Prints the version, or the commands and variables                                                        |

`SWIFTACE_RELEASES_URL` points `upgrade` somewhere other than this repository's releases.

## Configuration

The binary reads its bootstrap settings from the environment; it never reads a `.env` file.

| Variable                            | What it's for                                                                 |
| ----------------------------------- | ----------------------------------------------------------------------------- |
| `DATABASE_URL`                      | Postgres, e.g. `postgres://user:password@localhost:5432/swiftace`             |
| `JWT_SECRET_KEY`, `HASH_SECRET_KEY` | Long random strings. Changing the first signs everyone out                    |
| `PORT`                              | The site's port (4000)                                                        |
| `PREVIEW_PORT`                      | The notebook preview's port (4100), or 0 to turn it off                       |
| `PREVIEW_ALLOWED_PARENT_ORIGINS`    | The origins that may embed the preview, e.g. `https://example.com` (required) |
| `HOST`                              | The address both listen on (every address)                                    |

The rest (SES email, S3-compatible object storage, rich Jupyter output previews, login providers,
Stripe, Turnstile, PostHog, OpenAI for the AI tutor, branding, pricing
copy, legal pages) is set at `/manage/config` and kept in the `site_config` table, so changing it
needs no restart. Secrets are write-only there and never sent to the browser.

On a fresh database, configure SES before signing in. Save this JSON to a local file with mode
`0600`, fill in the SES credentials and verified sender, then run
`swiftace configure-integrations /path/to/integrations.json` (after `swiftace migrate`):

```json
{
  "email": {
    "enabled": true,
    "region": "us-east-1",
    "accessKeyId": "YOUR_ACCESS_KEY_ID",
    "secretAccessKey": "YOUR_SECRET_ACCESS_KEY",
    "fromEmail": "notify@example.com"
  }
}
```

Sign up at `/login`, run `swiftace make-admin you@example.com`, then configure storage and other
settings at `/manage/config`. The CLI accepts any integration sections, preserves omitted ones,
and keeps saved secrets when their submitted values are blank. Remove the local JSON file once
setup is complete. Existing SES, R2 and preview environment variables are no longer used. After
upgrading, save those settings using the CLI or `/manage/config`. Authentication keys stay in the
environment.

Behind a reverse proxy, the site's address must be a concrete hostname, like `example.com {
reverse_proxy 127.0.0.1:4000 }` in Caddy. Sign-in links are built from the request's `Host`
header, so a proxy that forwards any host would let a forged one put a live link in a real email.

## Notebook preview

Notebook outputs whose scripts have to run, like Plotly charts, render in a page on a domain of
its own (e.g. `preview.example.com`), which `swiftace start` serves on `PREVIEW_PORT` and the site
embeds in an iframe using the URL in `/manage/config` → Jupyter output preview.
Rich previews default to off. Enable them and enter a separate preview origin to render interactive
outputs; static HTML and text alternatives remain available while off. The page runs arbitrary
notebook script, and it may live on a subdomain of the site, so it never gets a real origin:

- the site embeds it with `sandbox="allow-scripts"` and no `allow-same-origin`
- its `Content-Security-Policy: sandbox …` header forces the same opaque origin even if something
  frames it without that attribute, so `document.cookie` is never readable or writable
- the proxy strips the incoming `Cookie` header and any `Set-Cookie`, so the site's cookies never
  reach it. The Caddy block `swiftace deploy` writes does this:

  ```caddyfile
  preview.example.com {
  	reverse_proxy 127.0.0.1:4100 {
  		header_up -Cookie
  		header_down -Set-Cookie
  	}
  }
  ```

- `frame-ancestors`, and the origins the page accepts messages from, are both
  `PREVIEW_ALLOWED_PARENT_ORIGINS`, so the two can't drift apart. The preview won't start without it

The site posts `{ iframeEvaluation: "<js>", theme: "light" | "dark" }` once the iframe loads, and
`{ theme }` when the theme changes; the page replies with `{ resizeHeight: <px> }`.

## Development

You need [Vite+](https://viteplus.dev) (`vp`), [Bun](https://bun.sh) and a Postgres database of
your own.

1. `vp install` - Install dependencies
2. `cp .env.example .env` and fill it in
3. `vp run db:migrate` - Create the tables
4. `vp run dev` - Run the development server on port 3000, and `vp run dev:preview` beside it for
   the notebook preview
5. Sign up at `/login`, then `vp run make-admin you@example.com`
6. Open `/manage/config` to name the site, upload its images and turn on integrations

Other commands:

- `vp check`, `vp test run` - Typecheck, lint and format; run the unit tests
- `vp run build` - Build the binary into `dist/swiftace` (no secrets needed)
- `vp run smoke-test dist/swiftace` - Run it against an empty database (`DATABASE_URL`)
- `bun test/integration.ts dist/swiftace` - Drive it in Chromium against an empty database and
  fakes of SES, R2 and OpenAI (`test/fake-services.ts`, which `bun test/fake-services.ts` also
  runs on its own)
- `vp run check-version origin/main` - Check `package.json`'s version for a PR

### Database

`src/lib/schema.server.ts` defines the tables, and `drizzle/` holds the migrations generated from
it. After changing the schema, `vp run db:generate` writes a new migration, which
`vp run db:migrate` (or `swiftace migrate`) applies. The first migration, `0000_init`, creates
the whole schema.

### Releases

A PR that changes what goes into the binary bumps `package.json`'s version by one step (below 1.0,
the minor version for breaking changes and the patch version for others); others leave it be.
Merging a bump to `main` builds, tests and publishes the four binaries and `SHA256SUMS` as a
GitHub release. See `.github/workflows/release.yml`.

### Social images

Generate a 1200 × 630 social preview image from your logo:

```sh
vp run generate-social-images --logo path/to/logo-on-dark.svg --domain example.com \
  --headline "First line\nSecond line" --stat "800+:hours of coursework"
```

The output is `site-preview.png`; upload it as the social preview image on the Branding tab of
`/manage/config`. `--variant cover` and `--variant frame` (which uses `--logo` on a light
background, with `--logo-dark` for the dark variants) are other layouts. Layout, typography and
artwork live in `scripts/social-images/`; colors use the design tokens in `src/styles.css`. It
needs Chromium: `vp exec playwright install chromium`.

## License

[MIT](LICENSE)
