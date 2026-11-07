// Compiles the swiftace binary for the platform it runs on: one file with Bun's runtime, the CLI,
// and the Nitro server `vp build` wrote to .output/, whose client assets, `public/` and PDFium's
// WebAssembly are inlined into it. `vp run build` runs both steps and writes dist/swiftace.
//
//   bun scripts/build.ts [--target bun-linux-x64]
import { existsSync } from "node:fs"
import { stat } from "node:fs/promises"
import { join, relative, resolve } from "node:path"
import { parseArgs } from "node:util"

import packageJson from "../package.json" with { type: "json" }

const ROOT = resolve(import.meta.dir, "..")
const OUTFILE = join(ROOT, "dist/swiftace")
const { values } = parseArgs({ options: { target: { type: "string" } } })

if (!existsSync(join(ROOT, ".output/server/index.mjs"))) {
  console.error("There's no .output/server/index.mjs: run `vp build` first")
  process.exit(1)
}

console.log(`Compiling ${relative(ROOT, OUTFILE)} (${packageJson.version})...`)
const started = performance.now()
const result = await Bun.build({
  entrypoints: [join(ROOT, "src/cli/index.ts")],
  compile: {
    outfile: OUTFILE,
    ...(values.target ? { target: values.target as Bun.Build.CompileTarget } : {}),
    // It's configured with environment variables only, wherever it's run from.
    autoloadDotenv: false,
    autoloadBunfig: false,
  },
  minify: { syntax: true, whitespace: true },
})
if (!result.success) {
  for (const log of result.logs) console.error(log)
  process.exit(1)
}
const { size } = await stat(OUTFILE)
console.log(
  `Built in ${Math.round(performance.now() - started)} ms: ${(size / 1024 / 1024).toFixed(1)} MB`,
)
