import { http } from '@awesomeorganization/servers'
import { sseHandler } from '../main.js'
import { strictEqual } from 'assert'
import undici from 'undici'

const main = async () => {
  const host = '127.0.0.1'
  const port = 3000
  const { handle, push, end } = sseHandler()
  const socket = await http({
    host,
    onRequest(request, response) {
      switch (request.method) {
        case 'GET': {
          handle({
            request,
            response,
          })
          return
        }
      }
      response.end()
    },
    port,
  })
  let expectedChunk = '\n'
  const client = new undici.Client(`http://${host}:${port}`)
  {
    const { body } = await client.request({
      method: 'GET',
      path: '/public/test',
    })
    body.on('data', (chunk) => {
      strictEqual(chunk.toString('utf-8'), expectedChunk)
    })
  }
  let tests = 3
  const interval = setInterval(() => {
    const data = new Date().toISOString()
    expectedChunk = `data:${data}\n\n`
    push({
      data,
    })
    if (--tests === 0) {
      clearInterval(interval)
      end()
    }
  }, 3e3)
  socket.unref()
}

main()
