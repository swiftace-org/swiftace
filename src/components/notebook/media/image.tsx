export function Image({
  type,
  data,
  metadata,
  className,
}: {
  type: string
  data: string
  metadata?: { width?: number; height?: number }
  className?: string
}) {
  return (
    <div className="rendered_html">
      <img
        alt="Notebook output"
        src={`data:${type};base64,${data}`}
        width={metadata?.width}
        height={metadata?.height}
        className={className}
        style={{ display: "block", maxWidth: "100%", objectFit: "contain" }}
      />
    </div>
  )
}
