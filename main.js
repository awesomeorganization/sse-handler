// REFERENCES
// https://www.w3.org/TR/eventsource/
// https://html.spec.whatwg.org/multipage/server-sent-events.html

const STATUS_OK = 200
const DEFAULT_EVENT = 'message'
const EOLS = new RegExp('\\r\\n|\\r|\\n', 'g')

export const sseHandler = ({ queueSizeByEvent = {} } = { queueSizeByEvent: {} }) => {
  let clientId = 0
  let eventId = 0
  const clients = new Map()
  const chunksByEvent = new Map()
  for (const event in queueSizeByEvent) {
    if (queueSizeByEvent[event] > 0) {
      chunksByEvent.set(event, [])
    }
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
      .write('\n') // THIS FIRES AN EVENT NAMED OPEN AT THE EVENTSOURCE OBJECT
    for (const [, chunks] of chunksByEvent) {
      for (const chunk of chunks) {
        response.write(chunk)
      }
    }
    if (clientId === Number.MAX_SAFE_INTEGER) {
      clientId = 1
    } else {
      clientId++
    }
    clients.set(clientId, response)
    request.once('close', () => {
      clients.delete(clientId, response)
    })
    return clientId
  }
  const push = ({ data, event = DEFAULT_EVENT, stringify = false }) => {
    if (stringify === true) {
      try {
        data = JSON.stringify(data)
      } catch (error) {
        data = error
      }
      if (data instanceof Error) {
        return data // I THINK IT'S A GOOD IDEA TO HANDLE THE ERROR ON THE OTHER SIDE
      }
    } else if (EOLS.test(data) === true) {
      data = data.split(EOLS).join('\ndata:')
    }
    if (eventId === Number.MAX_SAFE_INTEGER) {
      eventId = 1
    } else {
      eventId++
    }
    const chunk = event === DEFAULT_EVENT ? `data:${data}\nid:${eventId}\n\n` : `event:${event}\ndata:${data}\nid:${eventId}\n\n`
    if (event in queueSizeByEvent === true) {
      const queueSize = queueSizeByEvent[event]
      const chunks = chunksByEvent.get(event)
      const size = chunks.push(chunk)
      if (queueSize < size) {
        chunksByEvent.set(event, chunks.slice(size - queueSize))
      }
    }
    for (const [, client] of clients) {
      client.write(chunk)
    }
    return eventId
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
