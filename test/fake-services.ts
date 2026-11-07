// Stand-ins for the services SwiftAce talks to, on one local port, so the real server can be run
// end to end without accounts or keys: Amazon SES (email), an S3-compatible store (R2), OpenAI's
// Responses API (the AI tutor, streamed) and a blank certificate template. Point the app at it with
// fakeServiceEnv(). What it receives is kept in `state` for tests to check.
//
//   bun test/fake-services.ts [port]   runs it on its own, printing what it receives
import { PDFDocument, rgb } from "pdf-lib"

export type FakeEmail = {
  from: string
  to: string[]
  subject: string
  html: string
  text: string
  attachments: string[]
}

export type FakeServices = {
  url: string
  /** Everything received so far. */
  state: {
    emails: FakeEmail[]
    /** Stored objects by `<bucket>/<key>`. */
    objects: Map<string, { body: Uint8Array<ArrayBuffer>; contentType: string }>
    /** The bodies of the AI tutor's requests. */
    openaiRequests: Record<string, unknown>[]
  }
  stop: () => Promise<void>
}

/** What the AI tutor's fake model replies with, streamed a word at a time. */
export const FAKE_TUTOR_REPLY = "Hello from the fake tutor. Keep going, you're doing great!"

/** The environment that sends the app's SES, R2 and OpenAI traffic to the fakes. */
export function fakeServiceEnv(url: string): Record<string, string> {
  return {
    AWS_ACCESS_KEY_ID: "fake",
    AWS_ACCESS_KEY_SECRET: "fake",
    AWS_REGION: "us-east-1",
    // Read by the AWS SDK for SES only, so R2's endpoint below still applies.
    AWS_ENDPOINT_URL_SESV2: url,
    R2_ENDPOINT_URL: url,
    R2_ACCESS_KEY_ID: "fake",
    R2_SECRET_ACCESS_KEY: "fake",
    R2_BUCKET: "swiftace-test",
    OPENAI_BASE_URL: `${url}/v1`,
  }
}

export async function startFakeServices({
  port = 0,
  log = false,
  tutorWordDelayMs = 5,
  tutorThinkMs = 0,
}: {
  port?: number
  log?: boolean
  /** How long the fake tutor takes per word, slower to watch it stream. */
  tutorWordDelayMs?: number
  /** How long the fake tutor pauses before its first word, as a model does while it thinks. */
  tutorThinkMs?: number
} = {}): Promise<FakeServices> {
  const state: FakeServices["state"] = { emails: [], objects: new Map(), openaiRequests: [] }
  const template = await blankCertificateTemplate()

  const server = Bun.serve({
    hostname: "127.0.0.1",
    port,
    // So the tutor's thinking pause isn't cut off at Bun's default of 10 seconds.
    idleTimeout: 0,
    async fetch(request) {
      const url = new URL(request.url)
      if (log) console.log(`fake: ${request.method} ${url.pathname}${url.search}`)

      if (url.pathname === "/certificate-template.pdf") {
        return new Response(template, { headers: { "Content-Type": "application/pdf" } })
      }
      if (request.method === "POST" && url.pathname === "/v2/email/outbound-emails") {
        const email = toFakeEmail(await request.json())
        state.emails.push(email)
        if (log) console.log(`fake: email to ${email.to.join(", ")}: ${email.subject}`)
        return Response.json({ MessageId: `fake-${state.emails.length}` })
      }
      if (request.method === "POST" && url.pathname === "/v1/responses") {
        const body = (await request.json()) as Record<string, unknown>
        state.openaiRequests.push(body)
        return body.stream
          ? streamedResponse(String(body.model), tutorWordDelayMs, tutorThinkMs)
          : Response.json(response(body))
      }
      return s3(request, url, state.objects)
    },
  })

  return {
    url: `http://127.0.0.1:${server.port}`,
    state,
    stop: () => server.stop(true),
  }
}

function toFakeEmail(body: unknown): FakeEmail {
  const { FromEmailAddress, Destination, Content } = body as {
    FromEmailAddress: string
    Destination?: { ToAddresses?: string[] }
    Content: {
      Simple: {
        Subject: { Data: string }
        Body: { Html?: { Data: string }; Text?: { Data: string } }
        Attachments?: { FileName: string }[]
      }
    }
  }
  const simple = Content.Simple
  return {
    from: FromEmailAddress,
    to: Destination?.ToAddresses ?? [],
    subject: simple.Subject.Data,
    html: simple.Body.Html?.Data ?? "",
    text: simple.Body.Text?.Data ?? "",
    attachments: (simple.Attachments ?? []).map((attachment) => attachment.FileName),
  }
}

/** Enough of S3 for the app: put, get, head and delete objects, by path or by virtual host. */
async function s3(
  request: Request,
  url: URL,
  objects: FakeServices["state"]["objects"],
): Promise<Response> {
  const hostBucket = /^([^.]+)\.127\.0\.0\.1|^([^.]+)\.localhost/.exec(url.hostname)
  const path = decodeURIComponent(url.pathname.slice(1))
  const name = hostBucket ? `${hostBucket[1] ?? hostBucket[2]}/${path}` : path
  const xml = (status: number, body: string) =>
    new Response(`<?xml version="1.0" encoding="UTF-8"?>${body}`, {
      status,
      headers: { "Content-Type": "application/xml" },
    })

  if (request.method === "POST" && url.searchParams.has("delete")) {
    const keys = [...(await request.text()).matchAll(/<Key>([^<]*)<\/Key>/g)].map((m) => m[1]!)
    const bucket = name.replace(/\/$/, "")
    for (const key of keys) objects.delete(`${bucket}/${key}`)
    const deleted = keys.map((key) => `<Deleted><Key>${key}</Key></Deleted>`).join("")
    return xml(200, `<DeleteResult>${deleted}</DeleteResult>`)
  }
  if (request.method === "PUT") {
    const raw = new Uint8Array(await request.arrayBuffer())
    const chunked =
      request.headers.get("content-encoding")?.includes("aws-chunked") ||
      request.headers.get("x-amz-content-sha256")?.startsWith("STREAMING-")
    objects.set(name, {
      body: chunked ? decodeAwsChunked(raw) : raw,
      contentType: request.headers.get("content-type") ?? "application/octet-stream",
    })
    return new Response(null, { headers: { ETag: `"${objects.size}"` } })
  }
  const object = objects.get(name)
  if (request.method === "DELETE") {
    objects.delete(name)
    return new Response(null, { status: 204 })
  }
  if (!object) {
    return xml(404, `<Error><Code>NoSuchKey</Code><Message>No ${name}</Message></Error>`)
  }
  const headers = {
    "Content-Type": object.contentType,
    "Content-Length": String(object.body.byteLength),
    ETag: '"fake"',
  }
  return new Response(request.method === "HEAD" ? null : object.body, { headers })
}

/** A streamed upload's bytes, without the chunk sizes and the trailing checksum. */
function decodeAwsChunked(raw: Uint8Array): Uint8Array<ArrayBuffer> {
  const parts: Uint8Array[] = []
  const decoder = new TextDecoder()
  let offset = 0
  while (offset < raw.length) {
    const lineEnd = raw.indexOf(13, offset)
    const size = parseInt(decoder.decode(raw.subarray(offset, lineEnd)).split(";")[0]!, 16)
    if (!size) break
    parts.push(raw.subarray(lineEnd + 2, lineEnd + 2 + size))
    offset = lineEnd + 2 + size + 2
  }
  return new Uint8Array(Buffer.concat(parts))
}

function response(body: Record<string, unknown>, status = "completed") {
  return {
    id: "resp_fake",
    object: "response",
    created_at: Math.floor(Date.now() / 1000),
    status,
    model: body.model,
    output:
      status === "completed"
        ? [
            {
              id: "msg_fake",
              type: "message",
              role: "assistant",
              status: "completed",
              content: [{ type: "output_text", text: FAKE_TUTOR_REPLY, annotations: [] }],
            },
          ]
        : [],
    output_text: status === "completed" ? FAKE_TUTOR_REPLY : "",
    usage:
      status === "completed"
        ? {
            input_tokens: 120,
            input_tokens_details: { cached_tokens: 0 },
            output_tokens: 12,
            output_tokens_details: { reasoning_tokens: 0 },
            total_tokens: 132,
          }
        : null,
  }
}

/** A Responses API stream: the message's text a word at a time, then the usage. */
function streamedResponse(model: string, wordDelayMs: number, thinkMs: number): Response {
  const item = { id: "msg_fake", type: "message", role: "assistant", status: "in_progress" }
  const part = { type: "output_text", text: "", annotations: [] }
  const words = FAKE_TUTOR_REPLY.split(/(?<= )/)
  const events: Record<string, unknown>[] = [
    { type: "response.created", response: response({ model }, "in_progress") },
    { type: "response.output_item.added", output_index: 0, item: { ...item, content: [] } },
    {
      type: "response.content_part.added",
      item_id: item.id,
      output_index: 0,
      content_index: 0,
      part,
    },
    ...words.map((delta) => ({
      type: "response.output_text.delta",
      item_id: item.id,
      output_index: 0,
      content_index: 0,
      delta,
    })),
    {
      type: "response.content_part.done",
      item_id: item.id,
      output_index: 0,
      content_index: 0,
      part: { ...part, text: FAKE_TUTOR_REPLY },
    },
    { type: "response.completed", response: response({ model }) },
  ]
  const encoder = new TextEncoder()
  const firstWord = events.findIndex((event) => event.type === "response.output_text.delta")
  const stream = new ReadableStream({
    async start(controller) {
      for (const [sequence_number, event] of events.entries()) {
        if (sequence_number === firstWord) await Bun.sleep(thinkMs)
        const data = JSON.stringify({ ...event, sequence_number })
        controller.enqueue(encoder.encode(`event: ${String(event.type)}\ndata: ${data}\n\n`))
        await Bun.sleep(wordDelayMs)
      }
      controller.close()
    },
  })
  return new Response(stream, { headers: { "Content-Type": "text/event-stream" } })
}

/** An A4 landscape page with a border, like the PDF an admin uploads for certificates. */
async function blankCertificateTemplate(): Promise<Uint8Array<ArrayBuffer>> {
  const pdf = await PDFDocument.create()
  // A page with nothing drawn has no content stream, which pdf-lib refuses to embed.
  pdf.addPage([841.89, 595.28]).drawRectangle({
    x: 24,
    y: 24,
    width: 793.89,
    height: 547.28,
    borderWidth: 2,
    borderColor: rgb(0.2, 0.3, 0.6),
  })
  return new Uint8Array(await pdf.save())
}

if (import.meta.main) {
  const fakes = await startFakeServices({ port: Number(process.argv[2] ?? 4190), log: true })
  console.log(`Fake services on ${fakes.url}. The app's environment for them:`)
  for (const [name, value] of Object.entries(fakeServiceEnv(fakes.url))) {
    console.log(`  ${name}=${value}`)
  }
}
