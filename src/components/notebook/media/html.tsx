import { Interweave } from "interweave"

import { stringify } from "../stringify"

function svgToImageUrl(svgMarkup: string) {
  const blob = new Blob([svgMarkup], { type: "image/svg+xml" })
  return URL.createObjectURL(blob)
}

export function Html({ data = "" }: { data?: string | string[] }) {
  return (
    <div className="rendered_html">
      <Interweave
        content={stringify(data)}
        transform={(node) => {
          if (node instanceof Element && node.tagName.toLowerCase() === "svg") {
            return <img src={svgToImageUrl(node.outerHTML)} alt="" />
          }
        }}
      />
    </div>
  )
}
