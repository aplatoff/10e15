//

import { Ping } from './proto'

export const createClient = (url: string) => {
  const queue: ArrayBufferLike[] = []
  const listeners: ((buf: ArrayBuffer) => void)[] = []

  let ws: WebSocket | null = null

  function initWebSocket() {
    ws = new WebSocket(url)
    ws.onopen = processQueue
    ws.onclose = () => {
      console.log('connection closed')
      scheduleReconnect()
    }
    ws.onerror = (e) => {
      console.error('connection error', e)
      scheduleReconnect()
    }
    ws.onmessage = (event) => {
      const blob = event.data as Blob
      blob.arrayBuffer().then((buffer) => {
        listeners.forEach((listener) => listener(buffer))
      })
    }
  }

  let reconnectTimer: Timer | undefined = undefined

  function scheduleReconnect() {
    if (reconnectTimer) return
    const timeout = 10000
    console.log(`Attempting to reconnect in ${timeout / 1000} seconds...`)
    reconnectTimer = setTimeout(() => {
      reconnectTimer = undefined
      console.log('Reconnecting...')
      initWebSocket()
    }, timeout)
  }

  function processQueue() {
    if (ws && ws.readyState === ws.OPEN) {
      while (true) {
        const data = queue.shift()
        if (data === undefined) break
        ws.send(data)
      }
    }
  }

  function postRequest(buffer: ArrayBufferLike) {
    queue.push(buffer)
    processQueue()
  }

  setInterval(async () => {
    if (ws && ws.readyState === ws.OPEN) {
      console.log('ping...')
      postRequest(new Uint8Array([Ping]).buffer)
    }
  }, 30000)

  initWebSocket()

  return {
    postRequest,
    addListener(listener: (buf: ArrayBuffer) => void) {
      listeners.push(listener)
    },
  }
}
