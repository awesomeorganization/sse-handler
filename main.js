import { STATUS_CODES } from 'http'

// REFERENCES
// https://www.w3.org/TR/eventsource/
// https://html.spec.whatwg.org/multipage/server-sent-events.html

const STATUS_OK = 200
const DEFAULT_QUEUE = 0

export const sseHandler = ({ queue = DEFAULT_QUEUE } = { query: DEFAULT_QUEUE }) => {
  const responses = []
  let chunks = []
  return {
    end() {
      for (const response of responses) {
        response.end()
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
      if (queue > 0) {
        response.write(chunks.join(''))
      }
      const requestIndex = responses.push(response)
      request.once('close', () => {
        responses.splice(requestIndex, 1)
      })
    },
    push({ data, event, stringify = false }) {
      if (stringify === true || typeof data !== 'string') {
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
      let chunk
      if (typeof event !== 'string') {
        chunk = `data:${data}\n\n`
      } else {
        chunk = `event:${event}\ndata:${data}\n\n`
      }
      if (queue > 0) {
        chunks.push(chunk)
        if (chunks.length > queue) {
          chunks = chunks.slice(-queue)
        }
      }
      for (const response of responses) {
        response.write(chunk)
      }
      return null
    },
  }
}
