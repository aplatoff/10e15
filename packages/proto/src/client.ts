//

import { type PageNo } from 'model'
import { metadata } from './methods'
import type { RpcRequest } from './types'

const ws = new WebSocket('ws://localhost:8080')

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

function subscribeEncoder(view: DataView, pageNo: PageNo) {
  view.setUint32(0, pageNo)
}

const encoders: Record<string, (...params: any[]) => void> = {
  subscribe: subscribeEncoder,
}

const headerSize = 4

function writeHeader(view: DataView, code: number, id: number | undefined) {
  if (id !== undefined) view.setUint32(0, id)
  view.setUint8(0, code)
}

export const createClient = () => ({
  postRequest(request: RpcRequest) {
    const meta = metadata[request.method]
    const bufferSize = headerSize + meta.payloadSize
    const buffer = new ArrayBuffer(bufferSize)
    writeHeader(new DataView(buffer, 0, headerSize), meta.code, request.id)

    const encoder = encoders[request.method]
    encoder(new DataView(buffer, headerSize), ...request.params)

    postRequest(buffer)
  },
  addResponseListener() {},
})
