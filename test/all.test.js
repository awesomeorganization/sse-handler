/* eslint-disable node/no-unsupported-features/es-syntax */

import { message, sseHandler } from '../main.js'

import { http } from '@awesomeorganization/servers'
import { strictEqual } from 'assert'
import undici from 'undici'

const test = () => {
  const { end, handle, push } = sseHandler({
    queueSizeByEvent: {
      four: 4,
      one: 1,
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
      await new Promise((resolve) => {
        const events = [
          {
            data: 'message',
          },
          {
            data: 'line #1\nline #2',
          },
          {
            data: 'message',
            event: 'x',
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
            event: 'x',
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
        const asserts = [
          '\n\n',
          ...events.map((iterator, index) => {
            return message({
              ...iterator,
              id: index + 1,
            })
          }),
        ]
        const client = new undici.Client(url)
        client.request(
          {
            method: 'GET',
            path: '/',
          },
          (error, { body }) => {
            body.setEncoding('utf8')
            body.on('data', (chunk) => {
              strictEqual(chunk, asserts.shift())
              if (events.length !== 0) {
                push(events.shift())
              }
              if (asserts.length === 0) {
                end()
                resolve(client.close())
              }
            })
          }
        )
      })
      await new Promise((resolve) => {
        const events = ['alpha', 'beta', 'gamma', 'sigma'].map((data) => {
          return {
            data,
            event: 'four',
            stringify: true,
          }
        })
        const asserts = [
          events
            .map((iterator, index) => {
              return message({
                ...iterator,
                id: index + 10,
              })
            })
            .join(''),
        ]
        events.forEach((event) => {
          push(event)
        })
        const client = new undici.Client(url)
        client.request(
          {
            method: 'GET',
            path: '/',
          },
          (error, { body }) => {
            body.setEncoding('utf8')
            body.on('data', (chunk) => {
              strictEqual(chunk, asserts.shift())
              if (asserts.length === 0) {
                end()
                resolve(client.close())
              }
            })
          }
        )
      })
      await new Promise((resolve) => {
        const events = ['alpha', 'beta', 'gamma', 'sigma']
          .map((data) => {
            return [
              {
                data,
                event: 'four',
                stringify: true,
              },
              {
                data,
                event: 'one',
                stringify: true,
              },
            ]
          })
          .flat()
        const asserts = [
          events
            .map((iterator, index) => {
              return message({
                ...iterator,
                id: index + 14,
              })
            })
            .filter((iterator, index) => {
              return index % 2 === 0 || index === events.length - 1
            })
            .join(''),
        ]
        events.forEach((event) => {
          push(event)
        })
        const client = new undici.Client(url)
        client.request(
          {
            method: 'GET',
            path: '/',
          },
          (error, { body }) => {
            body.setEncoding('utf8')
            body.on('data', (chunk) => {
              strictEqual(chunk, asserts.shift())
              if (asserts.length === 0) {
                end()
                resolve(client.close())
              }
            })
          }
        )
      })
      this.close()
    },
    onRequest(request, response) {
      handle({
        request,
        response,
      })
    },
  })
}

test()
