# SwiftAce

SwiftAce is an open-source course platform: video lessons, Jupyter notebooks, quizzes, graded
assignments, certificates, an AI tutor and Stripe subscriptions. It's a TanStack Start app, built
with Vite+ and compiled into a single Bun binary, with its data in Postgres.

- All source code is in `src/`; `src/cli/` is the `swiftace` binary's command line (see below)
- `components/ui` contains components from shadcn-ui (never edit these files directly)
  - always use these and add new ones using CLI if needed, don't write them yourself
  - one standing exception: `sidebar.tsx` imports `useIsMobile` from `@/lib/hooks`, not the
    `@/hooks/use-mobile` file shadcn ships — re-point that import after every `shadcn add`
    and delete the `src/hooks/` directory the CLI recreates
- code that is sensitive and should only be used on the server goes in a `*.server.ts` file
- any helper used in just one file can still be placed at the bottom of that file

## Where code goes

Every route module owns its code through four sibling folders. Put a thing next to the
**topmost route that uses it**; when two sibling routes need it, move it to the `-lib` of
their closest shared parent — the same rule for all four folders.

- `-components/` — one component per file, kebab-case after the component
- `-functions/` — one `createServerFn` per file, named `load*` for loaders and `submit*` for
  mutations, matching the export
- `-lib/` — the module's own `utils.ts`, `utils.server.ts`, `db.server.ts`, `constants.ts`

Being used from two places is not a reason to hoist something. If one module clearly **owns**
the thing, it stays in that module's `-lib` and the others cross-import it — `certificate/-lib`
owns the `certificates/<slug>/` R2 key layout, and the participants page imports the writer from
there rather than the pair moving somewhere neutral. Climb to `src/lib/` only when no single
module owns it: the session, SES, course visibility.

`src/lib/` is the top of that hierarchy, not a dumping ground: `utils.ts` (plus `cn` and the
middlewares), `utils.server.ts`, `db.server.ts`, `schema.server.ts`, `config.ts`,
`config.server.ts`. Prefer pushing something down to a `-lib` over adding to it.

- `config.ts` / `config.server.ts` — environment variables, plus the constants shared across
  route groups; never read `process.env` directly
- nothing specific to one deployment (a name, a domain, copy, a key) goes in code: it's a
  setting on `/manage/config` with a generic default in `DEFAULT_SITE_CONFIG`, or, only if it's
  needed before the database can be read, an env variable listed in `.env.example`
- a module's own constants go in its `-lib/constants.ts` (not `config` — that name is for env)
  - move a derived family as a unit: a vocabulary, the `*_LABELS`/`*_VALUES` built from it and
    its `DEFAULT_*` stay in one file
- **types are the exception to all of the above.** They live in `src/types/`, grouped by subject
  (`account`, `course`, `quiz`, `evaluation`, …) — never in a `-lib`. A type is a contract
  between a producer and a consumer in different modules, so splitting by producer just forces
  cross-module imports or duplicate declarations.

## Routes

- `routes/` uses TanStack Router filesystem routing, with `(group)` folders for route groups —
  `(auth)`, `(billing)`, `(manage)` — which don't affect URLs but do prefix route **ids**, so
  `getRouteApi("/(manage)/manage/evaluate/")` includes the group
- prefer nesting a shared guard or chrome into a layout route over repeating it per page — see
  `(manage)/manage.tsx`, which owns the admin check and the navbar for everything under it
- learner and admin views of the same resource stay in one tree (`course/$courseSlug` and
  `course/$courseSlug_.manage`) so `course/-lib` can hold what they share
- every route with a `loader` needs a `pendingComponent` built from `Skeleton`
  (`@/components/ui/skeleton`) that mirrors the real layout — same wrapper, spacing and element
  sizes — rather than a generic placeholder

## Server functions and middleware

- guard server functions with `authMiddleware` (requires a signed-in account) or `adminMiddleware` (also requires admin) from `@/lib/utils` — never re-implement the check with `getCurrentAccount()`
  - both put the account on `context.account`, so the handler gets it for free
  - they live in `lib/utils.ts`, **not** `lib/utils.server.ts`: a `.middleware([...])` chain survives into the client bundle (only the `.server()` body is stripped), and the framework's import protection rejects middleware imported from a `*.server.*` file
- routes still need their own `beforeLoad` guard, because a server function can't `redirect({ to: "/login" })` — the middleware is the backstop for a direct call after the session expires
- server functions report expected problems by returning `{ error: string }`; the middleware throws instead, so every caller that awaits one must `try`/`catch` and surface the failure with `toSubmitErrorMessage` rather than leaving a button stuck on "Saving..."
- Never surface raw DB errors directly to the end user, make sure to handle them & show a better message in server function

## Database

- queries live in the owning module's `-lib/db.server.ts`; `src/lib/db.server.ts` holds only the
  cross-group ones and the shared column lists and predicates the module files build on
- `src/lib/schema.server.ts` has the connection and the table definitions
- every exported db function wraps **exactly one query**; anything needing several orchestrates
  them at the call site (usually the server function)
  - when several writes must land atomically, wrap them in `runInTransaction` and pass the `tx` it gives you as the optional last argument of each db function
  - soft deletes (`deleted = true`) are UPDATEs and belong beside the module's other queries
- every default lives in Postgres (`.default(x)`, never `.$defaultFn`), so a row is complete whoever inserts it
  - flags are `boolean(...).default(x).notNull()`; a nullable boolean only where "unknown" is a real third state
  - timestamps are `timestamp` holding UTC, defaulting to `utcNow` rather than `now()`, which follows the server's `TimeZone`
  - `created_at` and `updated_at` are handled by the column definitions, so never pass them from a call site
  - index the columns a query filters or sorts on, and nothing a primary key already covers
- after changing the schema, `vp run db:generate` writes a migration into `drizzle/`; never edit
  one that's been released, since the migrator records each by its hash
- develop against your own Postgres (`DATABASE_URL` in `.env`), never a production database

## Forms and links

- every labelled control goes in a `Field` from `@/components/ui/field` — never hand-roll
  `<div className="space-y-2"><Label/><Input/></div>`
  - `FieldGroup` stacks the fields (set its `gap-*` to the rhythm the page wants; the default
    `gap-7` is looser than most of this app), `FieldLabel` replaces `Label`, `FieldDescription`
    replaces the muted helper `<p>`, and `FieldError` replaces `<p className="text-destructive">`
  - `FieldError` renders nothing when its children are empty, so pass the error straight in
    (`<FieldError>{error}</FieldError>`) instead of guarding with a ternary
  - a checkbox or radio and its label are `<Field orientation="horizontal">`
  - keep the `<form onSubmit={...}>` element and put the `FieldGroup` inside it — the form tag is
    what gives you submit-on-Enter; `Field` replaces the markup within, not the form itself
  - filter toolbars and other non-form control rows are not fields; plain `Label` is fine there
- text links always use `BlueLink` from `@/components/blue-link` — never a bare `<a>` or `Link`
  with hand-written underline classes
  - `BlueLink` wraps the router's `Link`, so it needs `to`; for a URL the router can't route to
    (a submitted assignment link, anything off-site) pass `external` and an `href` instead
  - it is blue only on hover by default; add `colored` for a link that has to read as a link at
    rest — inside prose, or a sentence of muted text
  - this is for links that read as links in a sentence or a table cell — a `Link` rendered into
    a `Button`, `DropdownMenuItem`, `SidebarMenuButton` or the navbar logo stays as it is

## Comments

- two lines maximum. Say why the code is the way it is, not what it does
- go longer only when losing the comment would cost a real bug — a silent NULL write, a leaked
  token, revoked paid access — and there are only a handful of those in the codebase
- don't narrate history ("this used to…"), restate the code, or annotate each step

## Tooling and conventions

- always use icons from lucide-react
- always use shadcn design tokens (background, foreground, primary, secondary, etc.) as listed in `src/styles.css`, do not hardcode colors
- never wrap forms (e.g. `<form>` elements) in a border; use spacing alone to separate them from surrounding content
- import `-components`, `-functions` and `-lib` **relatively**, so a reach across route groups is visible as `../../(billing)/…` rather than hidden behind an alias; use `@/xyz` for everything in `src/lib`, `src/types`, `src/components` and `src/emails`
- Use `vp check` to typecheck, lint, and report formatting issues (not `tsc`)
- Always use the Vite Plus binary `vp` to install dependencies, run `package.json` scripts etc. (never `npm`)
- This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.
- Use `vp dlx` instead of `npx` or `pnpm dlx`
- never change `package.json`'s `vite` entry away from `"catalog:"` — it must stay pinned to the same version as `vite-plus` via the `pnpm-workspace.yaml` catalog, not a hardcoded `npm:@voidzero-dev/vite-plus-core@x.y.z`

## The binary and its command line

- `vp run build` runs `vp build` (Nitro's Bun preset, with `public/` and the client assets inlined)
  and then `scripts/build.ts`, which compiles `src/cli/index.ts` and the server into
  `dist/swiftace`. It reads no `.env` or `bunfig.toml`: production is configured by its environment
- `src/cli/` holds one module per command, each imported only when it runs; keep the logic that
  can be tested (Caddyfile edits, version checks, env files) in plain functions with `*.test.ts`
  beside them, since `vp test` runs them under Node, not Bun
- the binary embeds `drizzle/` and the notebook preview page (`src/cli/preview/index.html`) through
  Bun macros in `src/cli/embed.ts`
- the notebook preview's isolation is security-critical: it must keep its `sandbox` CSP, never set
  or receive cookies, and take its allowed origins from `PREVIEW_ALLOWED_PARENT_ORIGINS` alone
- a PR that changes what goes into the binary bumps `package.json`'s version by one step, and one
  that doesn't leaves it be; `vp run check-version origin/main` says which. Merging a bump to
  `main` releases it
- `test/fake-services.ts` fakes SES, R2, OpenAI and a certificate template on one local port;
  `test/integration.ts` drives a built binary in Chromium against it and a throwaway database, and
  `scripts/smoke-test.ts` is the lighter check CI runs on every Linux binary
