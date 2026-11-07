import { ArrowUpIcon, SquareIcon } from "lucide-react"
import { useRef, useState } from "react"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { useSiteConfig } from "@/lib/hooks"

import { AI_TUTOR_MESSAGE_MAX_LENGTH } from "../-lib/constants"

/** Enter sends and Shift+Enter starts a new line; while a reply streams, the button stops it. */
export function AiTutorPromptInput({
  isBusy,
  disabled,
  onSend,
  onStop,
}: {
  isBusy: boolean
  disabled: boolean
  onSend: (text: string) => void
  onStop: () => void
}) {
  const { aiTutor } = useSiteConfig()
  const formRef = useRef<HTMLFormElement>(null)
  const [text, setText] = useState("")
  const canSend = !disabled && !isBusy && !!text.trim()

  return (
    <form
      ref={formRef}
      onSubmit={(event) => {
        event.preventDefault()
        if (!canSend) return
        onSend(text)
        setText("")
      }}
    >
      <InputGroup className="items-end rounded-xl bg-background">
        <InputGroupTextarea
          aria-label={`Message ${aiTutor.name}`}
          placeholder={`Ask ${aiTutor.name} anything…`}
          value={text}
          disabled={disabled}
          maxLength={AI_TUTOR_MESSAGE_MAX_LENGTH}
          rows={1}
          className="max-h-48 min-h-11 px-3 py-3 text-sm"
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault()
              formRef.current?.requestSubmit()
            }
          }}
        />
        <InputGroupAddon align="inline-end" className="pr-1.5">
          {isBusy ? (
            <InputGroupButton
              variant="default"
              size="icon-sm"
              className="rounded-full"
              aria-label="Stop"
              onClick={onStop}
            >
              <SquareIcon className="fill-current" />
            </InputGroupButton>
          ) : (
            <InputGroupButton
              type="submit"
              variant="default"
              size="icon-sm"
              className="rounded-full"
              aria-label="Send"
              disabled={!canSend}
            >
              <ArrowUpIcon />
            </InputGroupButton>
          )}
        </InputGroupAddon>
      </InputGroup>
    </form>
  )
}
