import { STATUS_CODES } from 'http'
import { http } from '@awesomeorganization/servers'
import { sseHandler } from './main.js'

const STATUS_OK = 200
const INDEX_PAGE = `
<body>
  <style>
    .is-flex {
      display: flex;
    }
    .is-flex > div {
      padding: 2rem;
    }
  </style>
  <div class="is-flex">
    <div>
      <ol id="without-event"></ol>
    </div>
    <div>
      <ol id="with-event"></ol>
    </div>
  </div>
  <script>
    const withoutEvent = document.querySelector('#without-event')
    const withEvent = document.querySelector('#with-event')
    const source = new EventSource('/sse')
    source.addEventListener('message', ({ data }) => {
      const li = document.createElement('li')
      li.innerText = data
      withoutEvent.append(li)
    })
    source.addEventListener('someEvent', ({ data }) => {
      const li = document.createElement('li')
      li.innerText = data
      withEvent.append(li)
    })
  </script>
</body>
`

const main = async () => {
  const { handle, push } = sseHandler()
  await http({
    host: '127.0.0.1',
    onRequest: (request, response) => {
      switch (request.method) {
        case 'GET': {
          switch (request.url) {
            // SERVING INDEX PAGE
            case '/': {
              response
                .writeHead(STATUS_OK, STATUS_CODES[STATUS_OK], {
                  'Cache-Control': 'no-store',
                  'Content-Type': 'text/html',
                })
                .end(INDEX_PAGE)
              return
            }
            case '/sse': {
              handle({
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
    push({
      data: 'Hi!',
    })
    push({
      data: ['This is multiline', 'string with event.'].join('\n'),
      event: 'someEvent',
    })
  }, 3e3)
}

main()
