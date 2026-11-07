import type { UIMessage } from "@tanstack/ai"

import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Message, MessageContent } from "@/components/ui/message"

export function AiTutorUserMessage({ message }: { message: UIMessage }) {
  const text = message.parts.map((part) => (part.type === "text" ? part.content : "")).join("")
  return (
    <Message align="end">
      <MessageContent>
        <Bubble variant="secondary" align="end" className="max-w-[85%]">
          <BubbleContent className="whitespace-pre-wrap">{text}</BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  )
}
