/* global document EventSource */

'use strict'

const [withoutEvent, withEvent] = document.querySelectorAll('textarea')

const source = new EventSource('/sse')

source.addEventListener('message', ({ data }) => {
  withoutEvent.append(data + '\n')
})

source.addEventListener('someEvent', ({ data }) => {
  withEvent.append(data + '\n\n')
})
