import type { PDFiumLibrary } from "@hyzyla/pdfium"
import fontkit from "@pdf-lib/fontkit"
import { PDFDocument, PDFName, PDFString, rgb, type PDFFont, type PDFPage } from "pdf-lib"

import {
  CERTIFICATE_FONT_BOLD_PATH,
  CERTIFICATE_FONT_REGULAR_PATH,
  CERTIFICATE_PREVIEW_JPEG_QUALITY,
  CERTIFICATE_PREVIEW_WIDTH,
} from "./constants"

/**
 * A port of `project/certificate/gen_cert.py` from the legacy Flask app.
 *
 * Every coordinate, font size and autoscaling rule is copied from it, so a regenerated
 * certificate looks identical to the ones the legacy app issued. ReportLab and pdf-lib
 * both measure from the bottom-left in points, so the numbers carry over; the one difference is
 * that ReportLab puts a paragraph's first baseline at `y + height - fontSize`, which
 * `drawParagraph` reproduces.
 */

/** A millimetre in PostScript points, spelled the way ReportLab derives it. */
const MM = 72 / 25.4

/** ReportLab's `landscape(A4)`, i.e. 297mm × 210mm. */
const PAGE_WIDTH = 297 * MM
const PAGE_HEIGHT = 210 * MM

/** Where the text column starts, and how much room it has before the right margin. */
const LEFT_INDENT = 106 * MM
const GUTTER = 24 * MM
const TEXT_WIDTH = PAGE_WIDTH - LEFT_INDENT - GUTTER

const BLUE = rgb(0.050980392, 0.376470588, 1)
const GRAY = rgb(0.054901961, 0.270588235, 0.450980392)

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

const DAY_SUFFIXES: Record<string, string> = {
  "1": "st",
  "2": "nd",
  "3": "rd",
  "21": "st",
  "22": "nd",
  "23": "rd",
  "31": "st",
}

/** Mirrors `prettify_isodate`: `2026-07-26` becomes `July 26th, 2026`. */
export function formatCertificateDate(date: Date): string {
  const day = String(date.getUTCDate())
  return `${MONTHS[date.getUTCMonth()]} ${day}${DAY_SUFFIXES[day] ?? "th"}, ${date.getUTCFullYear()}`
}

type CertificateFonts = {
  regular: Uint8Array
  bold: Uint8Array
  /** The regular face, for checking which characters can actually be drawn. */
  coverage: ReturnType<typeof fontkit.create>
}

let cachedFonts: Promise<CertificateFonts> | null = null

/**
 * The two Inter faces the certificate is set in, fetched from the app's own origin — the same trick
 * the emails use for the logo, and the only way to read `public/` that survives the prod bundle.
 * Cached for the life of the process: ~800 KB together, and they never change.
 */
function loadCertificateFonts(siteUrl: string): Promise<CertificateFonts> {
  cachedFonts ??= (async () => {
    const [regular, bold] = await Promise.all([
      fetchAsset(`${siteUrl}${CERTIFICATE_FONT_REGULAR_PATH}`),
      fetchAsset(`${siteUrl}${CERTIFICATE_FONT_BOLD_PATH}`),
    ])
    return { regular, bold, coverage: fontkit.create(regular) }
  })().catch((error: unknown) => {
    // Don't let one failed fetch poison every later request.
    cachedFonts = null
    throw error
  })

  return cachedFonts
}

async function fetchAsset(url: string): Promise<Uint8Array> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`)
  }
  return new Uint8Array(await response.arrayBuffer())
}

/**
 * The characters the certificate can't render. Inter covers Latin, Greek and Cyrillic; the legacy
 * 23 MB Arial Unicode fallback isn't worth shipping, so an admin retypes the name in Latin script
 * rather than a certificate silently issuing full of blank boxes.
 */
export async function findUnrenderableCharacters(siteUrl: string, text: string): Promise<string[]> {
  const { coverage } = await loadCertificateFonts(siteUrl)
  const unsupported = new Set<string>()
  for (const character of text) {
    const codePoint = character.codePointAt(0)
    if (codePoint === undefined) continue
    if (/\s/.test(character)) continue
    if (!coverage.hasGlyphForCodePoint(codePoint)) unsupported.add(character)
  }
  return [...unsupported]
}

export type CertificateContent = {
  /** The app's own origin, used to fetch the fonts and to build the verification link. */
  siteUrl: string
  /** URL of the course's blank certificate PDF, which the text is drawn on top of. */
  templateUrl: string
  /** The name as it should be printed, which need not match the account's name. */
  name: string
  courseTitle: string
  organizationName: string
  courseHours: number
  issuedAt: Date
  slug: string
}

/** Draws a certificate and its preview image. */
export async function renderCertificate(
  content: CertificateContent,
): Promise<{ pdf: Uint8Array; image: Uint8Array }> {
  const fonts = await loadCertificateFonts(content.siteUrl)
  const template = await fetchAsset(content.templateUrl)

  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  const regular = await pdf.embedFont(fonts.regular, { subset: true })
  const bold = await pdf.embedFont(fonts.bold, { subset: true })

  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  const [templatePage] = await pdf.embedPdf(template)
  // Drawn at its natural size rather than stretched to the page, matching the legacy merge.
  page.drawPage(templatePage, { x: 0, y: 0 })

  // Issue date, centred under the seal on the left half of the certificate.
  const issued = `Issued ${formatCertificateDate(content.issuedAt)}`
  drawParagraph(page, {
    lines: [issued],
    font: regular,
    fontSize: 15,
    leading: 18,
    color: GRAY,
    x: GUTTER * 2 - regular.widthOfTextAtSize(issued, 15) / 2,
    y: 96 * MM,
  })

  drawParagraph(page, {
    lines: ["This is awarded to"],
    font: regular,
    fontSize: 17.5,
    leading: 20,
    color: GRAY,
    x: LEFT_INDENT,
    y: 120 * MM,
  })

  // The name is vertically centred in a fixed box so shrinking it doesn't shift the baseline.
  const nameBox = 42 * 1.2
  const name = autoscale(content.name, regular, 42, 42 * 1.2, nameBox, TEXT_WIDTH)
  drawParagraph(page, {
    ...name,
    font: regular,
    color: BLUE,
    x: LEFT_INDENT,
    y: 98 * MM + (nameBox - name.height) / 2,
  })

  drawParagraph(page, {
    lines: ["For successfully completing"],
    font: regular,
    fontSize: 15,
    leading: 18,
    color: GRAY,
    x: LEFT_INDENT,
    y: 86 * MM,
  })

  const courseBox = 20 * 2.1
  const course = autoscale(content.courseTitle, bold, 20, 20 * 1.1, courseBox, TEXT_WIDTH)
  drawParagraph(page, {
    ...course,
    font: bold,
    color: BLUE,
    x: LEFT_INDENT,
    y: 70 * MM + (courseBox - course.height) / 2 + course.fontSize / 5,
  })

  const subtitle =
    `an online course offered by ${content.organizationName}, ` +
    `representing approximately ${content.courseHours} hours of coursework`
  drawParagraph(page, {
    lines: wrapLines(subtitle, regular, 10, TEXT_WIDTH),
    font: regular,
    fontSize: 10,
    leading: 12,
    color: GRAY,
    x: LEFT_INDENT,
    y: 66 * MM,
  })

  const verifyUrl = `${content.siteUrl}/certificate/${content.slug}`
  const verification = `*Authenticity of this certificate can be verified at ${verifyUrl}`
  const verificationLines = wrapLines(verification, regular, 7, PAGE_WIDTH)
  drawParagraph(page, {
    lines: verificationLines,
    font: regular,
    fontSize: 7,
    leading: 9,
    color: GRAY,
    x: 0,
    y: 8 * MM,
    boxWidth: PAGE_WIDTH,
  })
  addVerificationLink(pdf, page, verifyUrl, {
    lines: verificationLines,
    font: regular,
    fontSize: 7,
    leading: 9,
    y: 8 * MM,
  })

  const pdfBytes = await pdf.save()
  return { pdf: pdfBytes, image: await renderPreviewImage(pdfBytes) }
}

let pdfium: Promise<PDFiumLibrary> | null = null

/**
 * Rasterises page one to a JPEG, used as the certificate page's `og:image` and its mobile
 * fallback. PDFium is several megabytes of WebAssembly, so it loads on demand and is then kept
 * for the life of the process. It hands back RGBA rows, the layout Jimp expects. The `.wasm` is
 * inlined by the `pdfiumWasm` plugin in `vite.config.ts`.
 */
async function renderPreviewImage(pdfBytes: Uint8Array): Promise<Uint8Array> {
  const [{ PDFiumLibrary }, { Jimp }, { default: wasmBase64 }] = await Promise.all([
    import("@hyzyla/pdfium"),
    import("jimp"),
    import("virtual:pdfium-wasm"),
  ])

  pdfium ??= PDFiumLibrary.init({ wasmBinary: decodeBase64(wasmBase64) }).catch(
    (error: unknown) => {
      pdfium = null
      throw error
    },
  )
  const library = await pdfium

  const document = await library.loadDocument(pdfBytes)
  try {
    const page = document.getPage(0)
    const bitmap = await page.render({
      scale: CERTIFICATE_PREVIEW_WIDTH / page.getOriginalSize().originalWidth,
      render: "bitmap",
    })
    const image = Jimp.fromBitmap({
      width: bitmap.width,
      height: bitmap.height,
      data: Buffer.from(bitmap.data),
    })
    return await image.getBuffer("image/jpeg", { quality: CERTIFICATE_PREVIEW_JPEG_QUALITY })
  } finally {
    document.destroy()
  }
}

type Paragraph = {
  lines: string[]
  font: PDFFont
  fontSize: number
  leading: number
  color: ReturnType<typeof rgb>
  x: number
  y: number
  /** Set to centre each line inside a box of this width, starting at `x`. */
  boxWidth?: number
}

/**
 * `y` is the bottom of the block, as it is for a ReportLab paragraph, so the text grows
 * upwards as lines are added.
 */
function drawParagraph(page: PDFPage, paragraph: Paragraph): void {
  const { lines, font, fontSize, leading, color, x, y, boxWidth } = paragraph
  const height = lines.length * leading

  lines.forEach((line, index) => {
    const lineX =
      boxWidth === undefined ? x : x + (boxWidth - font.widthOfTextAtSize(line, fontSize)) / 2
    page.drawText(line, {
      x: lineX,
      y: y + height - fontSize - index * leading,
      size: fontSize,
      font,
      color,
    })
  })
}

/**
 * Shrinks the text a point at a time until it fits the box, exactly as ReportLab's
 * `autoscale_text` did: the leading shrinks in step with the font size, and the only
 * failing condition is the total height, since a paragraph always fills the width it is
 * given. In practice that means one line at full size, wrapping only once the text has
 * shrunk far enough for two lines to fit.
 */
function autoscale(
  text: string,
  font: PDFFont,
  maxFontSize: number,
  maxLeading: number,
  maxHeight: number,
  maxWidth: number,
): { lines: string[]; fontSize: number; leading: number; height: number } {
  let fontSize = maxFontSize
  let leading = maxLeading

  for (;;) {
    const lines = wrapLines(text, font, fontSize, maxWidth)
    const height = lines.length * leading
    if (height <= maxHeight || fontSize <= 1) return { lines, fontSize, leading, height }
    fontSize -= 1
    leading -= 1
  }
}

/** Greedy word wrapping, matching ReportLab's; a single word longer than the box overflows. */
function wrapLines(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const lines: string[] = []
  let current = ""

  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = current ? `${current} ${word}` : word
    if (current && font.widthOfTextAtSize(candidate, fontSize) > maxWidth) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)

  return lines.length ? lines : [""]
}

/** Makes the verification URL printed at the foot of the certificate clickable. */
function addVerificationLink(
  pdf: PDFDocument,
  page: PDFPage,
  url: string,
  paragraph: Pick<Paragraph, "lines" | "font" | "fontSize" | "leading" | "y">,
): void {
  const { lines, font, fontSize, leading, y } = paragraph
  const height = lines.length * leading
  const annotations = lines.map((line, index) => {
    const width = font.widthOfTextAtSize(line, fontSize)
    const baseline = y + height - fontSize - index * leading
    return pdf.context.register(
      pdf.context.obj({
        Type: "Annot",
        Subtype: "Link",
        Rect: [
          (PAGE_WIDTH - width) / 2,
          baseline - 2,
          (PAGE_WIDTH + width) / 2,
          baseline + fontSize,
        ],
        Border: [0, 0, 0],
        A: { Type: "Action", S: "URI", URI: PDFString.of(url) },
      }),
    )
  })

  page.node.set(PDFName.of("Annots"), pdf.context.obj(annotations))
}

/** Copied into an ArrayBuffer of its own, since a Buffer's may be a slice of a shared pool. */
function decodeBase64(base64: string): ArrayBuffer {
  return new Uint8Array(Buffer.from(base64, "base64")).buffer
}
