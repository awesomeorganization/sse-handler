import { http } from '@awesomeorganization/servers'
import { sseHandler } from '../main.js'
import { strictEqual } from 'assert'
import undici from 'undici'

const test = () => {
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
  const extraChunksQueue = ['\n', `event:event\ndata:"message"\n\n`]
  const { end, handle, push } = sseHandler({
    queueSizeByEvent: {
      event: 1,
    },
  })
  http({
    listenOptions: {
      host: '127.0.0.1',
      port: 0,
    },
    async onListening() {
      const { address, port } = this.address()
      const url = `http://${address}:${port}`
      const { body } = await new undici.Client(url).request({
        method: 'GET',
        path: '/',
      })
      body.setEncoding('utf8')
      body.on('data', async (chunk) => {
        strictEqual(chunk, chunksQueue.shift())
        if (chunksQueue.length === 0) {
          const { body } = await new undici.Client(url).request({
            method: 'GET',
            path: '/',
          })
          body.setEncoding('utf8')
          body.on('data', (chunk) => {
            strictEqual(chunk, extraChunksQueue.shift())
            if (extraChunksQueue.length === 0) {
              end()
              this.close()
            }
          })
        }
      })
      body.once('data', () => {
        while (pushQueue.length !== 0) {
          strictEqual(push(pushQueue.shift()) instanceof Error, false)
        }
      })
    },
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
  })
}

test()
