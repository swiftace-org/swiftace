import { mkdir, readFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { parseArgs } from "node:util"

import { BadgeCheckIcon, FolderCodeIcon, GraduationCapIcon } from "lucide-react"
import { chromium } from "playwright"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"

const appRoot = fileURLToPath(new URL("../", import.meta.url))
const assets = resolve(appRoot, "scripts/social-images")
const artworkSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 1536 864"><defs><pattern id="d" width="34" height="34" patternUnits="userSpaceOnUse"><circle cx="4" cy="2" r="1.6" fill="#536fdc"/></pattern></defs><path fill="#3155d9" d="M0 0h1536v864H0z"/><path fill="url(#d)" d="M70 68h1400v738H70z"/><rect x="190" y="228" width="50" height="50" fill="#f0f1e9" rx="5"/><rect x="262" y="228" width="50" height="50" fill="#152957" rx="5"/><circle cx="287" cy="253" r="5" fill="#b7c9f3"/><rect x="334" y="228" width="50" height="50" fill="#152957" rx="5"/><circle cx="359" cy="253" r="5" fill="#b7c9f3"/><rect x="406" y="228" width="50" height="50" fill="#152957" rx="5"/><circle cx="431" cy="253" r="5" fill="#b7c9f3"/><rect x="478" y="228" width="50" height="50" fill="#f0f1e9" rx="5"/><rect x="190" y="300" width="50" height="50" fill="#152957" rx="5"/><circle cx="215" cy="325" r="5" fill="#b7c9f3"/><rect x="262" y="300" width="50" height="50" fill="#152957" rx="5"/><circle cx="287" cy="325" r="5" fill="#b7c9f3"/><rect x="334" y="300" width="50" height="50" fill="#152957" rx="5"/><circle cx="359" cy="325" r="5" fill="#b7c9f3"/><rect x="406" y="300" width="50" height="50" fill="#f0f1e9" rx="5"/><rect x="478" y="300" width="50" height="50" fill="#152957" rx="5"/><circle cx="503" cy="325" r="5" fill="#b7c9f3"/><rect x="190" y="372" width="50" height="50" fill="#152957" rx="5"/><circle cx="215" cy="397" r="5" fill="#b7c9f3"/><rect x="262" y="372" width="50" height="50" fill="#152957" rx="5"/><circle cx="287" cy="397" r="5" fill="#b7c9f3"/><rect x="334" y="372" width="50" height="50" fill="#f0f1e9" rx="5"/><rect x="406" y="372" width="50" height="50" fill="#152957" rx="5"/><circle cx="431" cy="397" r="5" fill="#b7c9f3"/><rect x="478" y="372" width="50" height="50" fill="#152957" rx="5"/><circle cx="503" cy="397" r="5" fill="#b7c9f3"/><rect x="190" y="444" width="50" height="50" fill="#152957" rx="5"/><circle cx="215" cy="469" r="5" fill="#b7c9f3"/><rect x="262" y="444" width="50" height="50" fill="#f0f1e9" rx="5"/><rect x="334" y="444" width="50" height="50" fill="#152957" rx="5"/><circle cx="359" cy="469" r="5" fill="#b7c9f3"/><rect x="406" y="444" width="50" height="50" fill="#152957" rx="5"/><circle cx="431" cy="469" r="5" fill="#b7c9f3"/><rect x="478" y="444" width="50" height="50" fill="#152957" rx="5"/><circle cx="503" cy="469" r="5" fill="#b7c9f3"/><rect x="190" y="516" width="50" height="50" fill="#f0f1e9" rx="5"/><rect x="262" y="516" width="50" height="50" fill="#152957" rx="5"/><circle cx="287" cy="541" r="5" fill="#b7c9f3"/><rect x="334" y="516" width="50" height="50" fill="#152957" rx="5"/><circle cx="359" cy="541" r="5" fill="#b7c9f3"/><rect x="406" y="516" width="50" height="50" fill="#152957" rx="5"/><circle cx="431" cy="541" r="5" fill="#b7c9f3"/><rect x="478" y="516" width="50" height="50" fill="#f0f1e9" rx="5"/><rect x="190" y="588" width="50" height="50" fill="#152957" rx="5"/><circle cx="215" cy="613" r="5" fill="#b7c9f3"/><rect x="262" y="588" width="50" height="50" fill="#152957" rx="5"/><circle cx="287" cy="613" r="5" fill="#b7c9f3"/><rect x="334" y="588" width="50" height="50" fill="#152957" rx="5"/><circle cx="359" cy="613" r="5" fill="#b7c9f3"/><rect x="406" y="588" width="50" height="50" fill="#f0f1e9" rx="5"/><rect x="478" y="588" width="50" height="50" fill="#152957" rx="5"/><circle cx="503" cy="613" r="5" fill="#b7c9f3"/><polyline points="602,435 710,435 710,598 771,598" fill="none" stroke="#b7c9f3" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="604" cy="435" r="8" fill="#f0f1e9"/><circle cx="860" cy="226" r="3" fill="#b7c9f3"/><circle cx="860" cy="289" r="3" fill="#b7c9f3"/><circle cx="860" cy="352" r="3" fill="#b7c9f3"/><circle cx="860" cy="415" r="3" fill="#b7c9f3"/><circle cx="860" cy="478" r="3" fill="#b7c9f3"/><circle cx="860" cy="541" r="3" fill="#b7c9f3"/><circle cx="860" cy="604" r="3" fill="#b7c9f3"/><circle cx="930" cy="226" r="3" fill="#b7c9f3"/><circle cx="930" cy="289" r="3" fill="#b7c9f3"/><circle cx="930" cy="352" r="3" fill="#b7c9f3"/><circle cx="930" cy="415" r="3" fill="#b7c9f3"/><circle cx="930" cy="478" r="3" fill="#b7c9f3"/><circle cx="930" cy="541" r="3" fill="#b7c9f3"/><circle cx="930" cy="604" r="3" fill="#b7c9f3"/><circle cx="1000" cy="226" r="3" fill="#b7c9f3"/><circle cx="1000" cy="289" r="3" fill="#b7c9f3"/><circle cx="1000" cy="352" r="3" fill="#b7c9f3"/><circle cx="1000" cy="415" r="3" fill="#b7c9f3"/><circle cx="1000" cy="478" r="3" fill="#b7c9f3"/><circle cx="1000" cy="541" r="3" fill="#b7c9f3"/><circle cx="1000" cy="604" r="3" fill="#b7c9f3"/><circle cx="1070" cy="226" r="3" fill="#b7c9f3"/><circle cx="1070" cy="289" r="3" fill="#b7c9f3"/><circle cx="1070" cy="352" r="3" fill="#b7c9f3"/><circle cx="1070" cy="415" r="3" fill="#b7c9f3"/><circle cx="1070" cy="478" r="3" fill="#b7c9f3"/><circle cx="1070" cy="541" r="3" fill="#b7c9f3"/><circle cx="1070" cy="604" r="3" fill="#b7c9f3"/><circle cx="1140" cy="226" r="3" fill="#b7c9f3"/><circle cx="1140" cy="289" r="3" fill="#b7c9f3"/><circle cx="1140" cy="352" r="3" fill="#b7c9f3"/><circle cx="1140" cy="415" r="3" fill="#b7c9f3"/><circle cx="1140" cy="478" r="3" fill="#b7c9f3"/><circle cx="1140" cy="541" r="3" fill="#b7c9f3"/><circle cx="1140" cy="604" r="3" fill="#b7c9f3"/><circle cx="1210" cy="226" r="3" fill="#b7c9f3"/><circle cx="1210" cy="289" r="3" fill="#b7c9f3"/><circle cx="1210" cy="352" r="3" fill="#b7c9f3"/><circle cx="1210" cy="415" r="3" fill="#b7c9f3"/><circle cx="1210" cy="478" r="3" fill="#b7c9f3"/><circle cx="1210" cy="541" r="3" fill="#b7c9f3"/><circle cx="1210" cy="604" r="3" fill="#b7c9f3"/><circle cx="1280" cy="226" r="3" fill="#b7c9f3"/><circle cx="1280" cy="289" r="3" fill="#b7c9f3"/><circle cx="1280" cy="352" r="3" fill="#b7c9f3"/><circle cx="1280" cy="415" r="3" fill="#b7c9f3"/><circle cx="1280" cy="478" r="3" fill="#b7c9f3"/><circle cx="1280" cy="541" r="3" fill="#b7c9f3"/><circle cx="1280" cy="604" r="3" fill="#b7c9f3"/><circle cx="1350" cy="226" r="3" fill="#b7c9f3"/><circle cx="1350" cy="289" r="3" fill="#b7c9f3"/><circle cx="1350" cy="352" r="3" fill="#b7c9f3"/><circle cx="1350" cy="415" r="3" fill="#b7c9f3"/><circle cx="1350" cy="478" r="3" fill="#b7c9f3"/><circle cx="1350" cy="541" r="3" fill="#b7c9f3"/><circle cx="1350" cy="604" r="3" fill="#b7c9f3"/><polyline points="810,190 810,668 1394,668" fill="none" stroke="#b7c9f3" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><rect x="860" y="465" width="55" height="174" fill="#f0f1e9" rx="3"/><rect x="960" y="408" width="55" height="231" fill="#f0f1e9" rx="3"/><rect x="1060" y="367" width="55" height="272" fill="#f0f1e9" rx="3"/><rect x="1160" y="282" width="55" height="357" fill="#f0f1e9" rx="3"/><rect x="1260" y="211" width="55" height="428" fill="#f0f1e9" rx="3"/><polyline points="850,588 930,542 1008,480 1086,431 1168,358 1240,294 1350,208" fill="none" stroke="#152957" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><circle cx="850" cy="588" r="13" fill="#152957"/><circle cx="850" cy="588" r="5" fill="#f0f1e9"/><circle cx="930" cy="542" r="13" fill="#152957"/><circle cx="930" cy="542" r="5" fill="#f0f1e9"/><circle cx="1008" cy="480" r="13" fill="#152957"/><circle cx="1008" cy="480" r="5" fill="#f0f1e9"/><circle cx="1086" cy="431" r="13" fill="#152957"/><circle cx="1086" cy="431" r="5" fill="#f0f1e9"/><circle cx="1168" cy="358" r="13" fill="#152957"/><circle cx="1168" cy="358" r="5" fill="#f0f1e9"/><circle cx="1240" cy="294" r="13" fill="#152957"/><circle cx="1240" cy="294" r="5" fill="#f0f1e9"/><circle cx="1350" cy="208" r="13" fill="#152957"/><circle cx="1350" cy="208" r="5" fill="#f0f1e9"/></svg>`
const { values } = parseArgs({
  options: {
    variant: { type: "string", default: "artwork" },
    output: { type: "string", default: "site-preview.png" },
    // The wordmark on the light `frame` variant, and on the dark ones unless `--logo-dark` is given.
    logo: { type: "string" },
    "logo-dark": { type: "string" },
    domain: { type: "string" },
    headline: { type: "string", default: "Hands-On Courses\nfor Practical Skills" },
    // Repeatable, as `--stat "800+:hours of coursework"`; up to three.
    stat: { type: "string", multiple: true, default: [] },
    help: { type: "boolean", short: "h" },
  },
})

if (values.help) {
  console.log(
    "Usage: vp run generate-social-images --logo path --domain example.com [--logo-dark path]",
  )
  console.log(
    '  [--headline "Line one\\nLine two"] [--stat "800+:hours of coursework"]... [--variant artwork|cover|frame] [--output path]',
  )
  console.log("Writes ./site-preview.png by default. No running app is required.")
} else {
  await generateImage().catch((error) => {
    console.error(`Social image generation failed: ${error.message}`)
    process.exitCode = 1
  })
}

async function generateImage() {
  if (!["artwork", "cover", "frame"].includes(values.variant)) {
    throw new Error("Choose artwork, cover, or frame for --variant")
  }
  if (!values.logo || !values.domain) throw new Error("Pass --logo and --domain")
  const logoPath = values.variant === "frame" ? values.logo : (values["logo-dark"] ?? values.logo)

  const output = resolve(appRoot, values.output)
  const [css, theme, font, background, logo] = await Promise.all([
    readFile(resolve(assets, "social-images.css"), "utf8"),
    readFile(resolve(appRoot, "src/styles.css"), "utf8"),
    dataUrl(
      resolve(
        appRoot,
        "node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
      ),
      "font/woff2",
    ),
    dataUrl(resolve(assets, "course-cover-background.svg"), "image/svg+xml"),
    dataUrl(resolve(logoPath), logoPath.endsWith(".svg") ? "image/svg+xml" : "image/png"),
  ])

  const artwork = `data:image/svg+xml;base64,${Buffer.from(artworkSvg).toString("base64")}`

  // Use the app's light-theme tokens so exports don't depend on the browser's theme.
  const primary = theme.match(/--primary:\s*([^;]+);/)?.[1]
  const chart = theme.match(/--chart-1:\s*([^;]+);/)?.[1]
  if (!primary || !chart) throw new Error("Missing primary or chart-1 design token")

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
    <style>
      @font-face { font-family: "Inter Variable"; font-style: normal; font-weight: 100 900; src: url("${font}") format("woff2"); }
      :root { --font-sans: "Inter Variable", sans-serif; --primary: ${primary}; --chart-1: ${chart}; }
      *, ::before, ::after { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: var(--font-sans); line-height: 1.5; }
      h1 { font-size: inherit; font-weight: inherit; }
      img, svg { display: block; vertical-align: middle; }
      img { max-width: 100%; height: auto; }
      ul { list-style: none; }
      ${css}
    </style></head><body>${imageMarkup({ background, artwork, logo })}</body></html>`

  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({
      viewport: { width: 1200, height: 630 },
      deviceScaleFactor: 1,
      colorScheme: "light",
      reducedMotion: "reduce",
    })
    await page.setContent(html)
    await page.evaluate(async () => {
      await document.fonts.ready
      await Promise.all(Array.from(document.images, (image) => image.decode()))
    })
    await mkdir(dirname(output), { recursive: true })
    await page.locator(".social-image").screenshot({ path: output, animations: "disabled" })
    console.log(`Generated ${output} (1200 × 630, ${values.variant})`)
  } finally {
    await browser.close()
  }
}

async function dataUrl(path, mimeType) {
  return `data:${mimeType};base64,${(await readFile(path)).toString("base64")}`
}

function imageMarkup({ background, artwork, logo }) {
  const isHero = values.variant !== "frame"
  const benefits = [
    { icon: GraduationCapIcon, label: "Learn practical skills" },
    { icon: FolderCodeIcon, label: "Build real-world projects" },
    { icon: BadgeCheckIcon, label: "Earn certificates" },
  ]
  const stats = values.stat.slice(0, 3).map((stat) => {
    const [value, ...label] = stat.split(":")
    return [escapeHtml(value.trim()), escapeHtml(label.join(":").trim())]
  })
  // A real line break, or a typed `\n` from the command line.
  const headline = values.headline
    .split(/\n|\\n/)
    .map(escapeHtml)
    .join("<br>")

  return `<div class="social-image social-image-${values.variant}">
    <img src="${background}" alt="" class="social-cover-background">
    ${values.variant === "artwork" ? `<img src="${artwork}" alt="" class="social-artwork"><div class="social-artwork-shade"></div>` : ""}
    <div class="social-image-content">
      <div class="social-image-top"><img src="${logo}" alt="" width="218" height="60"><span>${escapeHtml(values.domain)}</span></div>
      <div class="${isHero ? "social-image-hero" : "social-image-message"}">
        <div class="social-image-message">
          <h1>${headline}</h1>
          ${
            isHero
              ? `<ul class="social-image-benefits">${benefits.map(({ icon: Icon, label }) => `<li>${renderToStaticMarkup(createElement(Icon, { "aria-hidden": true, strokeWidth: 1.75 }))}<span>${label}</span></li>`).join("")}</ul>`
              : "<p>Learn practical skills. Build real projects.<br>Earn certificates.</p>"
          }
        </div>
        ${isHero && stats.length ? `<dl class="social-image-stats">${stats.map(([value, label]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("")}</dl>` : ""}
      </div>
      ${isHero ? "" : `<div class="social-image-bottom">${stats[0] ? `<strong>${stats[0][0]} ${stats[0][1]}</strong>` : ""}<span>Learn at your own pace</span></div>`}
    </div>
  </div>`
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
