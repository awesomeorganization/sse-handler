import { http } from '@awesomeorganization/servers'
import { rewriteHandler } from '@awesomeorganization/rewrite-handler'
import { sseHandler } from '@awesomeorganization/sse-handler'
import { staticHandler } from '@awesomeorganization/static-handler'

const example = async () => {
  const sseMidleware = sseHandler()
  const rewriteMiddleware = rewriteHandler({
    rules: [
      {
        pattern: '(.*)/$',
        replacement: '$1/index.html',
      },
    ],
  })
  const staticMiddleware = await staticHandler({
    directoryPath: './static',
  })
  http({
    listenOptions: {
      host: '127.0.0.1',
      port: 3000,
    },
    onListening() {
      setInterval(() => {
        const timestamp = new Date().toISOString()
        sseMidleware.push({
          data: `${timestamp}: Hi!`,
        })
        sseMidleware.push({
          data: [timestamp, 'This is multiline', 'string with event.'].join('\n'),
          event: 'someEvent',
        })
      }, 3e3)
    },
    onRequest(request, response) {
      switch (request.method) {
        case 'GET': {
          switch (request.url) {
            case '/sse': {
              sseMidleware.handle({
                request,
                response,
              })
              return
            }
            default: {
              rewriteMiddleware.handle({
                request,
                response,
              })
              if (response.writableEnded === false) {
                staticMiddleware.handle({
                  request,
                  response,
                })
              }
              return
            }
          }
        }
      }
      response.end()
    },
  })
  // TRY
  // http://127.0.0.1:3000/
}

example()
