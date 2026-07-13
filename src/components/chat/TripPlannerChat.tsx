import { useState, useRef, useEffect } from 'react'
import { useTripPlannerChat } from '../../lib/useTripPlannerChat'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, User, Loader2, Send } from 'lucide-react'
import type { Trip } from '../../lib/database.types'

interface TripPlannerChatProps {
  trip: Trip
}

export function TripPlannerChat({ trip }: TripPlannerChatProps) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, isLoading, streamingText, error } =
    useTripPlannerChat(trip.id)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    sendMessage(text)
  }

  return (
    <div className="flex flex-col h-[600px]">
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-amber-400/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot size={16} className="text-amber-400" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-amber-400 text-ink-950 rounded-tr-sm'
                    : 'bg-ink-800 border border-ink-700 text-slate-800 rounded-tl-sm'
                }`}
              >
                <MarkdownRenderer
                  content={msg.parts
                    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
                    .map((p) => p.text)
                    .join('')}
                />
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                  <User size={16} className="text-ink-950" />
                </div>
              )}
            </motion.div>
          ))}
          {(isLoading || streamingText) && (
            <motion.div
              key="streaming"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-400/10 flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={16} className="text-amber-400" />
              </div>
              <div className="bg-ink-800 border border-ink-700 rounded-2xl rounded-tl-sm px-4 py-3">
                {streamingText ? (
                  <MarkdownRenderer content={streamingText} />
                ) : (
                  <Loader2 size={16} className="text-slate-500 animate-spin" />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {error && (
          <p className="text-xs text-rose-400 text-center">{error}</p>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask about flights, routes, dates..."
          disabled={isLoading}
          className="flex-1 bg-ink-800 border border-ink-600 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-600 focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/30 transition-all disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-amber-400 text-ink-950 p-2.5 rounded-xl hover:bg-amber-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}

function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let inList = false
  let listItems: React.ReactNode[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (/^###?\s/.test(line)) {
      flushList()
      const text = line.replace(/^###?\s+/, '')
      elements.push(
        <p key={`h-${i}`} className="font-display font-semibold text-slate-900 mt-2 mb-1">
          {text}
        </p>,
      )
      continue
    }

    if (/^\*\s/.test(line)) {
      inList = true
      const text = line.replace(/^\*\s+/, '')
      listItems.push(<li key={`li-${i}`}>{formatInline(text)}</li>)
      continue
    }

    if (inList) flushList()

    if (line.trim() === '') {
      elements.push(<div key={`sp-${i}`} className="h-2" />)
      continue
    }

    elements.push(
      <p key={`p-${i}`} className="mb-1 last:mb-0">
        {formatInline(line)}
      </p>,
    )
  }

  if (inList) flushList()

  function flushList() {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="list-disc pl-4 space-y-1 my-1">
          {listItems}
        </ul>,
      )
      listItems = []
      inList = false
    }
  }

  return <>{elements}</>
}

function formatInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="text-xs bg-ink-700 px-1.5 py-0.5 rounded font-mono text-amber-400">
          {part.slice(1, -1)}
        </code>
      )
    }
    return <span key={i}>{part}</span>
  })
}
