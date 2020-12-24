// REFERENCES
// https://www.w3.org/TR/eventsource/
// https://html.spec.whatwg.org/multipage/server-sent-events.html

const STATUS_OK = 200
const DEFAULT_EVENT = 'message'

export const sseHandler = ({ queueSizeByEvent = {} } = { queueSizeByEvent: {} }) => {
  let index = Number.MIN_VALUE
  const clients = new Map()
  const chunksByEvent = new Map()
  for (const event in queueSizeByEvent) {
    chunksByEvent.set(event, [])
  }
  const end = () => {
    for (const [, client] of clients) {
      client.end()
    }
  }
  const flush = ({ event = DEFAULT_EVENT } = { event: DEFAULT_EVENT }) => {
    if (chunksByEvent.has(event) === true) {
      chunksByEvent.set(event, [])
    }
  }
  const handle = ({ request, response }) => {
    response
      .writeHead(STATUS_OK, {
        'Cache-Control': 'no-store',
        'Connection': 'keep-alive',
        'Content-Type': 'text/event-stream',
      })
      .write('\n') // This fires an event named open at the EventSource object
    for (const [, chunks] of chunksByEvent) {
      for (const chunk of chunks) {
        response.write(chunk)
      }
    }
    const key = index
    if (key === Number.MAX_VALUE) {
      index = Number.MIN_VALUE
    } else {
      index += 1
    }
    clients.set(key, response)
    request.once('close', () => {
      clients.delete(key, response)
    })
  }
  const push = ({ data, event = DEFAULT_EVENT, stringify = false }) => {
    if (stringify === true) {
      try {
        data = JSON.stringify(data)
      } catch (error) {
        data = error
      }
      if (data instanceof Error) {
        return data // I think it's a good idea to handle the error on the other side
      }
    } else if (data.includes('\r') === true || data.includes('\n') === true) {
      data = data.split(/\r\n|\r|\n/).join('\ndata:')
    }
    const chunk = event === DEFAULT_EVENT ? `data:${data}\n\n` : `event:${event}\ndata:${data}\n\n`
    if (event in queueSizeByEvent === true) {
      const chunks = chunksByEvent.get(event)
      const queueSize = queueSizeByEvent[event]
      if (queueSize < chunks.push(chunk)) {
        chunksByEvent.set(event, chunks.slice(-queueSize))
      }
    }
    for (const [, client] of clients) {
      client.write(chunk)
    }
    return null
  }
  return {
    chunksByEvent,
    clients,
    end,
    flush,
    handle,
    push,
  }
}
