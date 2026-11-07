export const TEXT = "text/plain"
export const HTML = "text/html"
export const LATEX = "text/latex"
export const MARKDOWN = "text/markdown"
export const IMAGE_PNG = "image/png"
export const IMAGE_JPG = "image/jpg"
export const IMAGE_JPEG = "image/jpeg"
export const IMAGE_GIF = "image/gif"
export const IMAGE_SVG = "image/svg+xml"
export const TEXT_JS = "text/javascript"
export const APP_JS = "application/javascript"
export const APP_JSON = "application/json"
export const PLOTLY_JSON = "application/vnd.plotly.v1+json"

/** Mime types checked in order — the first one present in an output's `data` wins. */
export const DISPLAY_ORDER = [
  PLOTLY_JSON,
  APP_JSON,
  APP_JS,
  TEXT_JS,
  HTML,
  MARKDOWN,
  LATEX,
  IMAGE_SVG,
  IMAGE_GIF,
  IMAGE_PNG,
  IMAGE_JPEG,
  IMAGE_JPG,
  TEXT,
]
