import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vite-plus/test"

const preview = vi.hoisted(() => ({ enabled: false, url: "" }))
vi.mock("@/lib/hooks", () => ({ useSiteConfig: () => ({ notebookPreview: preview }) }))
vi.mock("../media/media", () => ({ Media: ({ type }: { type: string }) => <span>{type}</span> }))

import { DisplayData } from "./display-data"

const output = {
  output_type: "display_data",
  data: { "application/vnd.plotly.v1+json": {}, "image/png": "image", "text/plain": "text" },
}

describe("rich notebook output selection", () => {
  it("uses a static alternative when rich previews are disabled", () => {
    preview.enabled = false
    preview.url = ""
    expect(renderToStaticMarkup(<DisplayData output={output} />)).toContain("image/png")
  })

  it("selects interactive output only with an enabled preview URL", () => {
    preview.enabled = true
    preview.url = "https://preview.example.com"
    expect(renderToStaticMarkup(<DisplayData output={output} />)).toContain(
      "application/vnd.plotly.v1+json",
    )
    preview.url = ""
    expect(renderToStaticMarkup(<DisplayData output={output} />)).toContain("image/png")
  })
})
