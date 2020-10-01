import { http } from '@awesomeorganization/servers'
import { rewriteHandler } from '@awesomeorganization/rewrite-handler'
import { sseHandler } from '@awesomeorganization/sse-handler'
import { staticHandler } from '@awesomeorganization/static-handler'

const main = async () => {
  const sseMidleware = sseHandler()
  const rewriteMiddleware = rewriteHandler()
  const staticMiddleware = staticHandler({
    directoryPath: './static',
  })
  rewriteMiddleware.push({
    pattern: '(.*)/$',
    replacement: '$1/index.html',
  })
  await http({
    host: '127.0.0.1',
    async onRequest(request, response) {
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
              await staticMiddleware.handle({
                request,
                response,
              })
              return
            }
          }
        }
      }
      response.end()
    },
    port: 3000,
  })
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
}

main()
