import { STATUS_CODES } from 'http'

// REFERENCES
// https://www.w3.org/TR/eventsource/
// https://html.spec.whatwg.org/multipage/server-sent-events.html

const STATUS_OK = 200

export const sseHandler = () => {
  const responses = []

  return {
    handle({ request, response }) {
      response.writeHead(STATUS_OK, STATUS_CODES[STATUS_OK], {
        'Cache-Control': 'no-store',
        'Connection': 'keep-alive',
        'Content-Type': 'text/event-stream',
      })
      const requestIndex = responses.push(response)
      request.once('close', () => {
        responses.splice(requestIndex, 1)
      })
    },
    push({ data, event }) {
      if (data.includes('\r') === true || data.includes('\n') === true) {
        data = data.split(/\r\n|\r|\n/).join('\ndata:')
      }
      if (event !== undefined) {
        for (const response of responses) {
          response.write(`event:${event}\ndata:${data}\n\n`)
        }
      } else {
        for (const response of responses) {
          response.write(`data:${data}\n\n`)
        }
      }
    },
  }
}
