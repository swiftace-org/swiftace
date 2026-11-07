import { Badge } from "@/components/ui/badge"
import type { AiTutorTranscriptMessage } from "@/types/ai-tutor"

import { formatMicrosAsUsd } from "../../../../course/-lib/ai-tutor"

/** What one reply cost and how it ended, under it in the transcript. */
export function AiTutorTranscriptUsage({ message }: { message: AiTutorTranscriptMessage }) {
  const details = [
    message.model,
    message.plan && `${message.plan} plan`,
    message.reasoningEffort && `${message.reasoningEffort} effort`,
    message.inputTokens !== null &&
      `${message.inputTokens.toLocaleString()} in (${(message.cachedInputTokens ?? 0).toLocaleString()} cached)`,
    message.outputTokens !== null &&
      `${message.outputTokens.toLocaleString()} out (${(message.reasoningTokens ?? 0).toLocaleString()} reasoning)`,
    message.durationMs !== null && `${(message.durationMs / 1000).toFixed(1)}s`,
  ].filter(Boolean)

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
      <span className="font-medium text-foreground tabular-nums">
        {formatMicrosAsUsd(message.costMicros)}
      </span>
      {details.map((detail) => (
        <span key={detail as string}>{detail}</span>
      ))}
      {message.usageEstimated && <Badge variant="outline">Estimated</Badge>}
      {message.status === "stopped" && <Badge variant="outline">Stopped</Badge>}
      {message.status === "error" && <Badge variant="destructive">Failed</Badge>}
      {message.error && <span className="w-full text-destructive">{message.error}</span>}
    </div>
  )
}
