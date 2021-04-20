/* eslint-disable node/no-unsupported-features/es-syntax */

// REFERENCES
// https://www.w3.org/TR/eventsource/
// https://html.spec.whatwg.org/multipage/server-sent-events.html

const STATUS_OK = 200
const DEFAULT_EVENT = 'message'
const EOLS = new RegExp('\\r\\n|\\r|\\n', 'g')

export const message = ({ data, event, id, retry, stringify }) => {
  const chunks = []
  if (event !== undefined && event !== DEFAULT_EVENT) {
    chunks.push(`event:${event}`)
  }
  if (data !== undefined) {
    let chunk
    if (stringify === true) {
      try {
        chunk = JSON.stringify(data)
      } catch (error) {
        chunk = error
      }
      if (chunk instanceof Error) {
        return chunk // I THINK IT'S A GOOD IDEA TO HANDLE THE ERROR ON THE OTHER SIDE
      }
    } else if (typeof data === 'string') {
      if (EOLS.test(data) === true) {
        chunk = data
          .split(EOLS)
          .map((iterator) => {
            return iterator.trim()
          })
          .join('\ndata:')
      } else {
        chunk = data.trim()
      }
    } else {
      return Error('Use stringify option to send an object')
    }
    chunks.push(`data:${chunk}`)
  }
  if (id !== undefined) {
    chunks.push(`id:${id}`)
  }
  if (retry !== undefined) {
    chunks.push(`retry:${retry}`)
  }
  return chunks.join('\n') + '\n\n'
}

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
    for (const client of clients.values()) {
      client.end()
    }
  }
  const flush = ({ event = DEFAULT_EVENT } = { event: DEFAULT_EVENT }) => {
    if (chunksByEvent.has(event) === true) {
      chunksByEvent.set(event, [])
    }
  }
  const handle = ({ request, response }) => {
    if (request.aborted === true || response.writableEnded === true) {
      return undefined
    }
    let buffer = ''
    for (const chunks of chunksByEvent.values()) {
      buffer += chunks.join('')
    }
    if (buffer.length === 0) {
      buffer = '\n\n' // THIS FIRES AN OPEN EVENT AT THE EVENTSOURCE
    }
    response
      .writeHead(STATUS_OK, {
        'Cache-Control': 'no-store',
        'Connection': 'keep-alive',
        'Content-Type': 'text/event-stream',
      })
      .write(buffer)
    if (clientId === Number.MAX_SAFE_INTEGER) {
      clientId = 1
    } else {
      clientId++
    }
    clients.set(clientId, response)
    request.once('close', () => {
      clients.delete(clientId)
    })
    return {
      clientId,
    }
  }
  const push = ({ data, event = DEFAULT_EVENT, stringify = false }) => {
    if (eventId === Number.MAX_SAFE_INTEGER) {
      eventId = 1
    } else {
      eventId++
    }
    const chunk = message({
      data,
      event,
      id: eventId,
      stringify,
    })
    if (chunk instanceof Error) {
      return {
        error: chunk,
        eventId,
      }
    }
    if (event in queueSizeByEvent === true) {
      const queueSize = queueSizeByEvent[event]
      const chunks = chunksByEvent.get(event)
      const size = chunks.push(chunk)
      if (queueSize < size) {
        chunks.splice(0, size - queueSize)
      }
    }
    for (const client of clients.values()) {
      if (client.writableEnded === true) {
        continue
      }
      client.write(chunk)
    }
    return {
      eventId,
    }
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
