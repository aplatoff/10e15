//

import { RpcException } from '.'
import { encoders, writeHeader } from './encoders'
import { methods } from './methods'
import type { RpcRequest } from './types'
import { HeaderSize } from './types'

const ws = new WebSocket('ws://localhost:3000/proto')

ws.onopen = processQueue
ws.onclose = () => {
  console.log('connection closed')
}
ws.onerror = (e) => {
  console.error('connection error', e)
}

const queue: ArrayBuffer[] = []

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

export const createClient = () => ({
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
  addResponseListener() {},
})
