import { useIsClient } from "@/lib/hooks"

const YOUTUBE_REGEX =
  /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([\w-]{11})/

// YouTube watch pages, Descript "view" links and the rest refuse to be framed
// (`X-Frame-Options`/`frame-ancestors`); each provider's "embed" variant is the one meant for iframes.
function normalizeVideoSrc(src: string) {
  const youtubeId = src.match(YOUTUBE_REGEX)?.[1]
  if (youtubeId) {
    const start = toYoutubeStartSeconds(src)
    return `https://www.youtube.com/embed/${youtubeId}${start ? `?start=${start}` : ""}`
  }

  return src
    .replace("share.descript.com/view/", "share.descript.com/embed/")
    .replace("loom.com/share/", "loom.com/embed/")
    .replace(/\.wistia\.(com|net)\/medias\//, ".wistia.$1/embed/iframe/")
}

/** Watch links carry `t=90`, `t=90s` or `t=1m30s`; the embed player only takes whole seconds. */
function toYoutubeStartSeconds(src: string) {
  const value = src.match(/[?&#](?:t|start)=([^&#]+)/)?.[1]
  if (!value) return 0
  if (/^\d+$/.test(value)) return Number(value)

  const [, hours, minutes, seconds] = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/) ?? []
  return Number(hours ?? 0) * 3600 + Number(minutes ?? 0) * 60 + Number(seconds ?? 0)
}

export function VideoEmbed({ src, title = "Lecture Video" }: { src: string; title?: string }) {
  const mounted = useIsClient()
  const embedSrc = normalizeVideoSrc(src)

  return (
    <div className="relative w-full rounded bg-muted" style={{ paddingBottom: "56.25%" }}>
      {mounted && (
        <iframe
          title={title}
          height="100%"
          width="100%"
          style={{ border: "none" }}
          className="absolute inset-0 rounded"
          src={embedSrc}
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          // oxlint-disable-next-line react/iframe-missing-sandbox
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
        />
      )}
    </div>
  )
}
