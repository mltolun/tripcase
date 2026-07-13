import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY') ?? ''
const API_BASE = 'https://openrouter.ai/api/v1'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { messages, trip_id } = await req.json()
    if (!messages || !Array.isArray(messages))
      throw new Error('messages array required')

    const systemPrompt = `You are a helpful trip planning assistant integrated into a travel app called TripCase. 
The user is planning a trip and needs help finding flights, building itineraries, and getting travel advice.

RULES:
1. ALWAYS use the search_flights tool to find real flight data before suggesting flights. Never make up prices or schedules.
2. Be PROACTIVE — if the user gives you a city name or destination, look up the airport code and search flights.
3. For multi-city trips, search each leg of the journey separately (e.g. for MAD→SFO and SFO→SAN, make two searches).
4. Make reasonable assumptions about dates if the user gives you general timing (e.g. "early July" = July 5th).
5. Always format flight information clearly with prices, airlines, departure/arrival times, and durations.
6. Be concise but thorough. Present the best options first.`

    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    ]

    const tools = [
      {
        type: 'function',
        function: {
          name: 'search_flights',
          description:
            'Search for available flights on Google Flights between two airports on a given date. Use this to find live flight options, prices, and schedules.',
          parameters: {
            type: 'object',
            properties: {
              origin: {
                type: 'string',
                description: 'Origin airport code (e.g. JFK, LHR, SFO)',
              },
              destination: {
                type: 'string',
                description: 'Destination airport code (e.g. LAX, CDG, NRT)',
              },
              date: {
                type: 'string',
                description: 'Departure date in YYYY-MM-DD format',
              },
              return_date: {
                type: 'string',
                description: 'Return date in YYYY-MM-DD format (omit for one-way)',
              },
              passengers: {
                type: 'number',
                description: 'Number of passengers (default 1)',
              },
            },
            required: ['origin', 'destination', 'date'],
          },
        },
      },
    ]

    const openRouterRes = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://tripcase.app',
        'X-Title': 'TripCase',
      },
      body: JSON.stringify({
        model: 'openrouter/free',
        messages: apiMessages,
        tools,
        tool_choice: 'auto',
        stream: true,
      }),
    })

    if (!openRouterRes.ok) {
      const body = await openRouterRes.text()
      throw new Error(`OpenRouter API error ${openRouterRes.status}: ${body}`)
    }

    const reader = openRouterRes.body!.getReader()
    const decoder = new TextDecoder()
    const encoder = new TextEncoder()

    let buffer = ''
    const toolCallDeltas = new Map<number, { id?: string; name?: string; arguments: string }>()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              const trimmed = line.trim()
              if (!trimmed.startsWith('data: ')) continue

              const data = trimmed.slice(6)
              if (data === '[DONE]') {
                flushToolCalls(controller, encoder, toolCallDeltas)
                controller.enqueue(encoder.encode(JSON.stringify({ type: 'done' }) + '\n'))
                continue
              }

              let chunk: any
              try {
                chunk = JSON.parse(data)
              } catch {
                continue
              }

              const delta = chunk.choices?.[0]?.delta
              if (!delta) continue

              if (delta.content) {
                flushToolCalls(controller, encoder, toolCallDeltas)
                controller.enqueue(
                  encoder.encode(JSON.stringify({ type: 'text', content: delta.content }) + '\n'),
                )
              }

              if (delta.tool_calls) {
                for (const tc of delta.tool_calls) {
                  const index = tc.index
                  if (!toolCallDeltas.has(index)) {
                    toolCallDeltas.set(index, {
                      id: tc.id,
                      name: tc.function?.name,
                      arguments: tc.function?.arguments || '',
                    })
                  } else {
                    const existing = toolCallDeltas.get(index)!
                    existing.arguments += tc.function?.arguments || ''
                  }
                }
              }

              const finishReason = chunk.choices?.[0]?.finish_reason
              if (finishReason === 'tool_calls') {
                flushToolCalls(controller, encoder, toolCallDeltas)
                controller.enqueue(encoder.encode(JSON.stringify({ type: 'done' }) + '\n'))
              } else if (finishReason === 'stop') {
                controller.enqueue(encoder.encode(JSON.stringify({ type: 'done' }) + '\n'))
              }
            }
          }

          flushToolCalls(controller, encoder, toolCallDeltas)
          controller.enqueue(encoder.encode(JSON.stringify({ type: 'done' }) + '\n'))
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({ type: 'error', message: (err as Error).message }) + '\n',
            ),
          )
          controller.enqueue(encoder.encode(JSON.stringify({ type: 'done' }) + '\n'))
        } finally {
          reader.releaseLock()
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/x-ndjson',
      },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})

function flushToolCalls(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  toolCallDeltas: Map<number, { id?: string; name?: string; arguments: string }>,
) {
  if (toolCallDeltas.size === 0) return

  const calls = Array.from(toolCallDeltas.entries()).map(([, tc]) => {
    let parsedArgs: any
    try {
      parsedArgs = JSON.parse(tc.arguments)
    } catch {
      parsedArgs = tc.arguments
    }
    return {
      id: tc.id,
      name: tc.name,
      arguments: parsedArgs,
    }
  })

  controller.enqueue(encoder.encode(JSON.stringify({ type: 'tool_calls', calls }) + '\n'))
  toolCallDeltas.clear()
}
