//

import { encoders, writeHeader } from './encoders'
import { RpcException } from './errors'
import { methods } from './methods'
import type { RpcRequest } from './types'
import { HeaderSize } from './types'

export const createClient = (url: string) => {
  const queue: ArrayBuffer[] = []
  const listeners: ((buf: ArrayBuffer) => void)[] = []

  const ws = new WebSocket(url)
  ws.onopen = processQueue
  ws.onclose = () => {
    console.log('connection closed')
  }
  ws.onerror = (e) => {
    console.error('connection error', e)
  }
  ws.onmessage = (event) => {
    const blob = event.data as Blob
    console.log('Received ws message:', blob)
    blob.arrayBuffer().then((buffer) => {
      listeners.forEach((listener) => listener(buffer))
    })
  }

  function processQueue() {
    if (ws.readyState === ws.OPEN) {
      while (true) {
        const data = queue.shift()
        if (data === undefined) break
        ws.send(data)
      }
    }
  }

  function postRequest(buffer: ArrayBuffer) {
    queue.push(buffer)
    processQueue()
  }

  return {
    postRequest(request: RpcRequest) {
      const method = methods[request.method]
      if (method === undefined) throw new RpcException(3, `method not found: ${request.method}`)

      const bufferSize = HeaderSize + method.size
      const encoder = encoders[method.code]

      const buffer = new ArrayBuffer(bufferSize)
      writeHeader(new DataView(buffer, 0, HeaderSize), method.code, request.id)
      encoder(new DataView(buffer, HeaderSize), ...request.params)

      postRequest(buffer)
    },
    addListener(listener: (buf: ArrayBuffer) => void) {
      listeners.push(listener)
    },
  }
}
