import type { UIMessage } from "@tanstack/ai"
import { useChat } from "@tanstack/ai-react"
import { useParams, useRouteContext } from "@tanstack/react-router"
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import { toast } from "@/components/ui/toast"
import { toSubmitErrorMessage } from "@/lib/utils"
import type { AiTutorConversationSummary, AiTutorStreamEvent, AiTutorUsage } from "@/types/ai-tutor"

import { loadAiTutorConversation } from "../-functions/load-ai-tutor-conversation"
import { loadAiTutorPanel } from "../-functions/load-ai-tutor-panel"
import { submitAiTutorMessage } from "../-functions/submit-ai-tutor-message"
import { submitDeleteAiTutorConversation } from "../-functions/submit-delete-ai-tutor-conversation"

type AiTutorContextValue = {
  courseSlug: string
  isSignedIn: boolean
  messages: ReadonlyArray<UIMessage>
  status: "ready" | "submitted" | "streaming" | "error"
  error: Error | undefined
  usage: AiTutorUsage | null
  conversations: AiTutorConversationSummary[]
  conversationId: number | null
  /** True while a past conversation is being fetched to open. */
  isOpening: boolean
  /** True for a signed-out visitor who tried to send, until they dismiss the prompt to sign in. */
  signInRequested: boolean
  setSignInRequested: (requested: boolean) => void
  send: (text: string) => void
  stop: () => void
  retry: () => void
  startNewConversation: () => void
  openConversation: (conversationId: number) => Promise<void>
  deleteConversation: (conversationId: number) => Promise<void>
  /** Fetches the learner's usage and conversations, the first time the panel is shown. */
  loadPanel: () => void
}

const AiTutorContext = createContext<AiTutorContextValue | null>(null)

export function useAiTutor(): AiTutorContextValue {
  const context = useContext(AiTutorContext)
  if (!context) throw new Error("useAiTutor must be used inside an AiTutorProvider.")
  return context
}

/**
 * The tutor's conversation, held above both of its panels — the desktop sidebar and the mobile
 * sheet, which unmounts when closed — so neither closing it nor moving between lessons loses it.
 * Keyed by the course and learner where it's rendered, so a change of either starts afresh.
 */
export function AiTutorProvider({
  courseSlug,
  children,
}: {
  courseSlug: string
  children: ReactNode
}) {
  const { account } = useRouteContext({ from: "__root__" })
  const { sectionSlug } = useParams({ strict: false })
  const [usage, setUsage] = useState<AiTutorUsage | null>(null)
  const [conversations, setConversations] = useState<AiTutorConversationSummary[]>([])
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [isOpening, setIsOpening] = useState(false)
  const [signInRequested, setSignInRequested] = useState(false)
  const panelLoaded = useRef(false)

  // Read by the fetcher at send time rather than captured when the chat was created.
  const request = useRef({
    conversationId: null as number | null,
    sectionSlug: sectionSlug ?? null,
    retry: false,
  })
  useEffect(() => {
    request.current.sectionSlug = sectionSlug ?? null
  }, [sectionSlug])

  const selectConversation = useCallback((id: number | null) => {
    request.current.conversationId = id
    setConversationId(id)
  }, [])

  const handleEvent = useCallback(
    (name: string, value: unknown) => {
      const event = { name, value } as AiTutorStreamEvent
      if (event.name === "conversation") {
        const { id } = event.value
        selectConversation(id)
        setConversations((current) =>
          current.some((conversation) => conversation.id === id)
            ? current.map((conversation) =>
                conversation.id === id
                  ? { ...conversation, lastMessageAt: new Date() }
                  : conversation,
              )
            : [{ id, title: null, lastMessageAt: new Date() }, ...current],
        )
      } else if (event.name === "title") {
        const { id, title } = event.value
        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === id ? { ...conversation, title } : conversation,
          ),
        )
      } else if (event.name === "usage") {
        setUsage(normalizeUsage(event.value))
      }
    },
    [selectConversation],
  )

  const chat = useChat({
    threadId: `ai-tutor-${courseSlug}`,
    // Each message is answered from the history the server keeps, so only the newest is sent.
    fetcher: ({ messages }, { signal }) => {
      const { retry } = request.current
      request.current.retry = false
      return submitAiTutorMessage({
        data: {
          courseSlug,
          sectionSlug: request.current.sectionSlug,
          conversationId: request.current.conversationId,
          text: retry ? "" : toText(messages.at(-1)),
          retry,
        },
        signal,
      })
    },
    onCustomEvent: handleEvent,
    // A message sent mid-reply would only be refused by the server, so it isn't queued.
    queue: { whenBusy: "drop" },
  })

  const refreshPanel = useCallback(async () => {
    if (!account) return
    try {
      const result = await loadAiTutorPanel({ data: { courseSlug } })
      if ("error" in result) return
      setUsage(normalizeUsage(result.usage))
      setConversations(result.conversations.map(normalizeConversation))
    } catch (error) {
      console.error("Failed to load the AI tutor's panel.", error)
    }
  }, [account, courseSlug])

  const loadPanel = useCallback(() => {
    if (panelLoaded.current) return
    panelLoaded.current = true
    void refreshPanel()
  }, [refreshPanel])

  // Nothing else tells the panel a limit has lifted, so it checks again once the window ends.
  const blockedUntil = usage?.blockedBy?.resetsAt?.getTime()
  useEffect(() => {
    if (!blockedUntil) return
    // setTimeout overflows past ~24.8 days; a weekly window is well within that.
    const delay = Math.min(Math.max(blockedUntil - Date.now(), 0) + 1000, 2 ** 31 - 1)
    const timer = window.setTimeout(() => void refreshPanel(), delay)
    return () => window.clearTimeout(timer)
  }, [blockedUntil, refreshPanel])

  const { sendMessage, stop: stopChat, reload, setMessages, isLoading } = chat

  const send = useCallback(
    (text: string) => {
      if (!account) {
        setSignInRequested(true)
        return
      }
      const trimmed = text.trim()
      if (!trimmed || isLoading) return
      void sendMessage(trimmed)
    },
    [account, isLoading, sendMessage],
  )

  const stop = useCallback(() => {
    stopChat()
    // The stopped reply's cost is only known once the server has saved it.
    window.setTimeout(() => void refreshPanel(), 1500)
  }, [refreshPanel, stopChat])

  const retry = useCallback(() => {
    request.current.retry = true
    void reload()
  }, [reload])

  const startNewConversation = useCallback(() => {
    if (isLoading) stopChat()
    selectConversation(null)
    setMessages([])
  }, [isLoading, selectConversation, setMessages, stopChat])

  const openConversation = useCallback(
    async (id: number) => {
      if (isLoading) stopChat()
      setIsOpening(true)
      try {
        const result = await loadAiTutorConversation({ data: { courseSlug, conversationId: id } })
        if ("error" in result) {
          toast.add({ type: "error", description: result.error })
          return
        }
        selectConversation(result.id)
        setMessages(result.messages)
      } catch (error) {
        toast.add({
          type: "error",
          description: toSubmitErrorMessage(error, "Couldn't open that conversation."),
        })
      } finally {
        setIsOpening(false)
      }
    },
    [courseSlug, isLoading, selectConversation, setMessages, stopChat],
  )

  const deleteConversation = useCallback(
    async (id: number) => {
      try {
        const result = await submitDeleteAiTutorConversation({ data: { conversationId: id } })
        if ("error" in result) {
          toast.add({ type: "error", description: result.error })
          return
        }
        setConversations((current) => current.filter((conversation) => conversation.id !== id))
        if (id === conversationId) startNewConversation()
        toast.add({ type: "success", description: "Conversation deleted." })
      } catch (error) {
        toast.add({
          type: "error",
          description: toSubmitErrorMessage(error, "Couldn't delete that conversation."),
        })
      }
    },
    [conversationId, startNewConversation],
  )

  const value = useMemo<AiTutorContextValue>(
    () => ({
      courseSlug,
      isSignedIn: !!account,
      messages: chat.messages,
      status: chat.status as AiTutorContextValue["status"],
      error: chat.error,
      usage,
      conversations,
      conversationId,
      isOpening,
      signInRequested,
      setSignInRequested,
      send,
      stop,
      retry,
      startNewConversation,
      openConversation,
      deleteConversation,
      loadPanel,
    }),
    [
      account,
      chat.error,
      chat.messages,
      chat.status,
      conversationId,
      conversations,
      courseSlug,
      deleteConversation,
      isOpening,
      loadPanel,
      openConversation,
      retry,
      send,
      signInRequested,
      startNewConversation,
      stop,
      usage,
    ],
  )

  return <AiTutorContext.Provider value={value}>{children}</AiTutorContext.Provider>
}

function toText(message: UIMessage | undefined): string {
  return (message?.parts ?? []).map((part) => (part.type === "text" ? part.content : "")).join("")
}

/** Dates arrive as strings inside the stream's JSON, unlike from a server function. */
function normalizeUsage(usage: AiTutorUsage): AiTutorUsage {
  const toWindow = (window: AiTutorUsage["windows"][number]) => ({
    ...window,
    resetsAt: window.resetsAt ? new Date(window.resetsAt) : null,
  })
  return {
    ...usage,
    windows: usage.windows.map(toWindow),
    blockedBy: usage.blockedBy ? toWindow(usage.blockedBy) : null,
  }
}

function normalizeConversation(conversation: AiTutorConversationSummary) {
  return { ...conversation, lastMessageAt: new Date(conversation.lastMessageAt) }
}
