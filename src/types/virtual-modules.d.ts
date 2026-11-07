/** `pdfium.wasm` as base64, from the `pdfiumWasm` plugin in `vite.config.ts`. */
declare module "virtual:pdfium-wasm" {
  const base64: string
  export default base64
}

/** The Nitro server `vp build` writes, which starts listening when it's imported (see `start`). */
declare module "#server" {}
