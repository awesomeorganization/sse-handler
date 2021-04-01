import { message, sseHandler } from '../main.js'
import { http } from '@awesomeorganization/servers'
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
    ...pushQueue.map((iterator, index) => {
      return message({
        ...iterator,
        id: index + 1,
      })
    }),
  ]
  const extraChunksQueue = [
    '\n',
    message({
      ...pushQueue[5],
      id: 6,
    }),
  ]
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
      const clientA = new undici.Client(url)
      const { body: bodyA } = await clientA.request({
        method: 'GET',
        path: '/',
      })
      bodyA.setEncoding('utf8')
      bodyA.on('data', async (chunkA) => {
        strictEqual(chunkA, chunksQueue.shift())
        if (chunksQueue.length === 0) {
          const clientB = new undici.Client(url)
          const { body: bodyB } = await clientB.request({
            method: 'GET',
            path: '/',
          })
          bodyB.setEncoding('utf8')
          bodyB.on('data', async (chunkB) => {
            strictEqual(chunkB, extraChunksQueue.shift())
            if (extraChunksQueue.length === 0) {
              end()
              await clientA.close()
              await clientB.close()
              this.close()
            }
          })
        }
      })
      bodyA.once('data', () => {
        while (pushQueue.length !== 0) {
          push(pushQueue.shift())
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
