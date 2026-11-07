import { readFile } from "node:fs/promises"
import { createRequire } from "node:module"

import tailwindcss from "@tailwindcss/vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import { nitro } from "nitro/vite"
import { defineConfig, lazyPlugins, type Plugin } from "vite-plus"

/**
 * PDFium, which rasterises the certificate preview, loads its WebAssembly from a file beside its
 * own module, which a single binary doesn't have. `virtual:pdfium-wasm` is that file as base64,
 * so it's bundled into the server chunk that renders certificates and handed to `init`.
 */
function pdfiumWasm(): Plugin {
  const ID = "virtual:pdfium-wasm"
  return {
    name: "pdfium-wasm",
    resolveId: (id) => (id === ID ? `\0${ID}` : undefined),
    async load(id) {
      if (id !== `\0${ID}`) return
      const file = createRequire(import.meta.url).resolve("@hyzyla/pdfium/pdfium.wasm")
      return `export default ${JSON.stringify((await readFile(file)).toString("base64"))}`
    },
  }
}

const config = defineConfig({
  fmt: {
    // Drizzle's migrations are generated, and the migrator hashes their SQL.
    ignorePatterns: ["src/routeTree.gen.ts", "src/components/ui/**", "drizzle/**"],
    semi: false,
    sortImports: true,
  },
  lint: {
    ignorePatterns: ["src/routeTree.gen.ts", "src/components/ui/**"],
    plugins: ["eslint", "typescript", "unicorn", "oxc", "react", "jsx-a11y"],
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: {
      "vite-plus/prefer-vite-plus-imports": "error",
      "prefer-const": "off", // allow 'let' for variable declaration
      "react/rules-of-hooks": "error", // correct hook call order
      "react/exhaustive-deps": "warn", // complete dependency arrays in useEffect
      "react/jsx-key": "error", // key prop in lists
      "react/jsx-no-target-blank": "error", // safe external links
      "react/jsx-no-duplicate-props": "error", // no repeated props
      "react/no-direct-mutation-state": "error", // use setState instead
      "react/button-has-type": "error", // explicit button type
      "react/iframe-missing-sandbox": "error", // sandbox iframes
      "react/jsx-no-useless-fragment": "error", // remove extra fragments
      "react/jsx-no-comment-textnodes": "warn", // comments outside JSX text
      "react/jsx-no-script-url": "error", // no javascript: URLs
      "react/self-closing-comp": "warn", // self-close empty elements
      "react/checked-requires-onchange-or-readonly": "error", // controlled inputs
      "react/forward-ref-uses-ref": "error", // forwardRef must use ref
    },
    options: { typeAware: true, typeCheck: true },
  },
  resolve: { tsconfigPaths: true },
  plugins: lazyPlugins(() => [
    devtools(),
    // The server is compiled into one binary (scripts/build.ts), so `public/` and the client
    // assets are inlined into it rather than read from `.output/public`.
    nitro({ preset: "bun", serveStatic: "inline" }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    pdfiumWasm(),
  ]),
  server: { port: 3000 },
})

export default config
