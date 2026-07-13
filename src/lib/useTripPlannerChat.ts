import { useState, useCallback, useRef } from 'react'

const API_BASE = import.meta.env.VITE_SUPABASE_URL

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  parts: Array<{ type: 'text'; text: string }>
}

interface ToolCallEvent {
  id: string
  name: string
  arguments: Record<string, unknown>
}

type StreamEvent =
  | { type: 'text'; content: string }
  | { type: 'tool_calls'; calls: ToolCallEvent[] }
  | { type: 'error'; message: string }
  | { type: 'done' }

async function* streamChat(
  messages: { role: string; content: string }[],
  tripId: string,
): AsyncGenerator<StreamEvent> {
  const response = await fetch(`${API_BASE}/functions/v1/trip-planner-agent`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages, trip_id: tripId }),
  })

  if (!response.ok) {
    const text = await response.text()
    let message: string
    try {
      message = JSON.parse(text).error || text
    } catch {
      message = text
    }
    throw new Error(message)
  }

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        yield JSON.parse(trimmed) as StreamEvent
      }
    }
  } finally {
    reader.releaseLock()
  }
}

async function executeToolCall(
  toolCall: ToolCallEvent,
): Promise<Record<string, unknown>> {
  if (toolCall.name === 'search_flights') {
    const response = await fetch(`${API_BASE}/functions/v1/search-flights`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(toolCall.arguments),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`search-flights failed: ${text}`)
    }

    return await response.json()
  }

  throw new Error(`Unknown tool: ${toolCall.name}`)
}

function describeToolCall(tc: ToolCallEvent): string {
  if (tc.name === 'search_flights') {
    const args = tc.arguments as Record<string, string>
    const parts = [`Searching for flights from **${args.origin}** to **${args.destination}**`]
    if (args.date) parts.push(`on **${args.date}**`)
    if (args.return_date) parts.push(`returning **${args.return_date}**`)
    return parts.join(' ')
  }
  return `Running ${tc.name}...`
}

export function useTripPlannerChat(tripId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      parts: [
        {
          type: 'text' as const,
          text: `Hi! I'm your trip planning assistant for this trip. I can help find flights, build itineraries, and get travel info. What are you looking for?`,
        },
      ],
    },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  const sendMessage = useCallback(
    async (text: string) => {
      setIsLoading(true)
      setError(null)
      setStreamingText('')

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        parts: [{ type: 'text' as const, text }],
      }

      const prevMessages = messagesRef.current
      let apiMessages: { role: string; content: string }[] = [
        ...prevMessages.map((m) => ({
          role: m.role,
          content: m.parts.map((p) => p.text).join(''),
        })),
        { role: 'user' as const, content: text },
      ]

      let fullText = ''
      const assistantMessages: ChatMessage[] = []
      let turnCount = 0
      const MAX_TURNS = 5

      while (turnCount < MAX_TURNS) {
        setStreamingText(fullText || '*Thinking...*')
        let toolCalls: ToolCallEvent[] | null = null
        let turnError: string | null = null
        let turnText = ''

        try {
          for await (const event of streamChat(apiMessages, tripId)) {
            switch (event.type) {
              case 'text':
                turnText += event.content
                fullText += event.content
                setStreamingText(fullText)
                break
              case 'tool_calls':
                toolCalls = event.calls
                break
              case 'error':
                turnError = event.message
                break
              case 'done':
                break
            }
          }
        } catch (err) {
          turnError = (err as Error).message
        }

        if (turnError) {
          setError(turnError)
          break
        }

        if (toolCalls && toolCalls.length > 0) {
          apiMessages.push({ role: 'assistant' as const, content: turnText })
          assistantMessages.push({
            id: crypto.randomUUID(),
            role: 'assistant' as const,
            parts: turnText ? [{ type: 'text' as const, text: turnText }] : [],
          })

          for (const tc of toolCalls) {
            setStreamingText(`*${describeToolCall(tc)}...*`)
            let result: Record<string, unknown>
            try {
              result = await executeToolCall(tc)
            } catch (err) {
              result = { error: (err as Error).message }
            }
            apiMessages.push({
              role: 'user' as const,
              content: `[Tool result for ${tc.name}(${JSON.stringify(tc.arguments)}): ${JSON.stringify(result)}]`,
            })
          }

          turnCount++
          continue
        }

        assistantMessages.push({
          id: crypto.randomUUID(),
          role: 'assistant' as const,
          parts: turnText ? [{ type: 'text' as const, text: turnText }] : [],
        })

        const updatedMessages = [...prevMessages, userMessage, ...assistantMessages]
        setMessages(updatedMessages)
        messagesRef.current = updatedMessages
        setStreamingText('')
        break
      }

      if (turnCount >= MAX_TURNS) {
        setError('Assistant exceeded maximum response turns')
      }

      setIsLoading(false)
    },
    [tripId],
  )

  return { messages, sendMessage, isLoading, streamingText, error }
}
