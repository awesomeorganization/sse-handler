import { STATUS_CODES } from 'http'

// REFERENCES
// https://www.w3.org/TR/eventsource/
// https://html.spec.whatwg.org/multipage/server-sent-events.html

const STATUS_OK = 200
const DEFAULT_EVENT = 'message'

export const sseHandler = ({ queueSizeByEvent = {} } = { queueSizeByEvent: {} }) => {
  const responses = new Map()
  const chunksByEvent = new Map()
  for (const event in queueSizeByEvent) {
    chunksByEvent.set(event, [])
  }
  return {
    end() {
      for (const [, response] of responses) {
        response.end()
      }
    },
    flush({ event = DEFAULT_EVENT } = { event: DEFAULT_EVENT }) {
      if (chunksByEvent.has(event) === true) {
        chunksByEvent.set(event, [])
      }
    },
    handle({ request, response }) {
      response
        .writeHead(STATUS_OK, STATUS_CODES[STATUS_OK], {
          'Cache-Control': 'no-store',
          'Connection': 'keep-alive',
          'Content-Type': 'text/event-stream',
        })
        .write('\n') // This fires an event named open at the EventSource object
      for (const [, chunks] of chunksByEvent) {
        if (chunks.length > 0) {
          response.write(chunks.join(''))
        }
      }
      const key = Date.now().toString()
      responses.set(key, response)
      request.once('close', () => {
        responses.delete(key, response)
      })
    },
    push({ data, event = DEFAULT_EVENT, stringify = false }) {
      if (typeof data !== 'string' || stringify === true) {
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
      const chunk = typeof event !== 'string' || event === DEFAULT_EVENT ? `data:${data}\n\n` : `event:${event}\ndata:${data}\n\n`
      const queueSize = queueSizeByEvent[event]
      if (typeof queueSize === 'number') {
        const chunks = chunksByEvent.get(event)
        if (queueSize < chunks.push(chunk)) {
          chunksByEvent.set(event, chunks.slice(-queueSize))
        }
      }
      for (const [, response] of responses) {
        response.write(chunk)
      }
      return null
    },
  }
}
