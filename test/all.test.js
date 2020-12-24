import { http } from '@awesomeorganization/servers'
import { sseHandler } from '../main.js'
import { strictEqual } from 'assert'
import undici from 'undici'

const main = async () => {
  const host = '127.0.0.1'
  const port = 3000
  const { handle, push, end } = sseHandler({
    queueSizeByEvent: {
      event: 1,
    },
  })
  {
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
    socket.unref()
  }
  {
    const chunksQueue = [
      '\n',
      `data:message\n\n`,
      `data:line #1\ndata:line #2\n\n`,
      `event:event\ndata:message\n\n`,
      `data:"message"\n\n`,
      `data:"line #1\\nline #2"\n\n`,
      `event:event\ndata:"message"\n\n`,
      'data:{"a":"string","b":1,"c":true,"d":null}\n\n',
      'data:[1,2,3]\n\n',
      'data:{"type":"Buffer","data":[1,2,3]}\n\n',
    ]
    const { body } = await new undici.Client(`http://${host}:${port}`).request({
      method: 'GET',
      path: '/public/test',
    })
    body.on('data', (chunk) => {
      strictEqual(chunk.toString('utf8'), chunksQueue.shift())
    })
    body.once('data', () => {
      const pushQueue = [
        {
          data: 'message',
        },
        {
          data: 'line #1\nline #2',
        },
        {
          data: 'message',
          event: 'event',
        },
        {
          data: 'message',
          stringify: true,
        },
        {
          data: 'line #1\nline #2',
          stringify: true,
        },
        {
          data: 'message',
          event: 'event',
          stringify: true,
        },
        {
          data: {
            a: 'string',
            b: 1,
            c: true,
            d: null,
          },
          stringify: true,
        },
        {
          data: [1, 2, 3],
          stringify: true,
        },
        {
          data: Buffer.from([1, 2, 3]),
          stringify: true,
        },
      ]
      const done = async () => {
        strictEqual(
          push({
            data: 9007199254740991n, // JSON.stringify do not know how to serialize a BigInt
            stringify: true,
          }) instanceof Error,
          true
        )
        const chunksQueue = ['\n', `event:event\ndata:"message"\n\n`]
        const { body } = await new undici.Client(`http://${host}:${port}`).request({
          method: 'GET',
          path: '/public/test',
        })
        body.on('data', (chunk) => {
          strictEqual(chunk.toString('utf8'), chunksQueue.shift())
        })
        end()
      }
      const recursive = () => {
        strictEqual(push(pushQueue.shift()), null)
        if (pushQueue.length === 0) {
          done()
        } else {
          recursive()
        }
      }
      recursive()
    })
  }
}

main()
