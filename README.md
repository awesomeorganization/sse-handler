# sse-handler

:boom: [ESM] The server-sent events (sse) handler for Node.js according to w3.org and whatwg

---

![npm](https://img.shields.io/david/awesomeorganization/sse-handler)
![npm](https://img.shields.io/npm/v/@awesomeorganization/sse-handler)
![npm](https://img.shields.io/npm/dt/@awesomeorganization/sse-handler)
![npm](https://img.shields.io/npm/l/@awesomeorganization/sse-handler)
![npm](https://img.shields.io/bundlephobia/minzip/@awesomeorganization/sse-handler)
![npm](https://img.shields.io/bundlephobia/min/@awesomeorganization/sse-handler)

---

## Example

```
import { http } from '@awesomeorganization/servers'
import { sseHandler } from '@awesomeorganization/sse-handler'

const { handle, push } = sseHandler()

await http({
  host: '127.0.0.1',
  onRequest: (request, response) => {
    handle({
      request,
      response,
    })
  },
  port: 3000,
})

push({
  data: 'Hi!',
})

push({
  data: ['This is multiline', 'string with event.'].join('\n'),
  event: 'someEvent',
})
```
