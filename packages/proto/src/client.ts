//

import { encoders, writeHeader } from './encoders'
import { RpcException } from './errors'
import { methods } from './methods'
import type { RpcRequest, RpcResponse } from './types'
import { ErrorTag, HeaderSize, ResultTag } from './types'

export const createClient = (url: string, requestDecoder: (buf: ArrayBuffer) => RpcRequest) => {
  const queue: ArrayBuffer[] = []
  const responseListeners: ((response: RpcResponse) => void)[] = []
  const broadcastListeners: ((request: RpcRequest) => void)[] = []

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
      const view = new DataView(buffer)
      const code = view.getUint8(0)
      switch (code) {
        case ErrorTag:
          break
        case ResultTag:
          break
        default:
          const request = requestDecoder(buffer)
          broadcastListeners.forEach((listener) => listener(request))
          break
      }
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
    addResponseListener(listener: (response: RpcResponse) => void) {
      responseListeners.push(listener)
    },
    addBroadcastListener(listener: (request: RpcRequest) => void) {
      broadcastListeners.push(listener)
    },
  }
}
