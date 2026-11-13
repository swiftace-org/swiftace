// The notebook preview for development, beside `vp dev`, with the handler `swiftace start` uses:
//
//   vp run dev:preview   serves it on PREVIEW_PORT (4100) for http://localhost:3000
//
// Enable Jupyter output preview in /manage/config and set its URL to http://localhost:4100.
import { readPreviewPage } from "../src/cli/embed.ts"
import { DEFAULT_PREVIEW_PORT, readPort } from "../src/cli/environment.ts"
import { parseParentOrigins, previewHandler } from "../src/cli/preview.ts"

const port = readPort(process.env, "PREVIEW_PORT", DEFAULT_PREVIEW_PORT)
const origins = parseParentOrigins(
  process.env.PREVIEW_ALLOWED_PARENT_ORIGINS || "http://localhost:3000",
)
const server = Bun.serve({
  port,
  hostname: "127.0.0.1",
  fetch: previewHandler(readPreviewPage(), origins),
})
console.log(`Notebook preview on ${server.url} for ${origins.join(", ")}`)
