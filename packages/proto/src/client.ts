//

export const createClient = (url: string) => {
  const queue: ArrayBufferLike[] = []
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

  return {
    postRequest(buffer: ArrayBufferLike) {
      queue.push(buffer)
      processQueue()
    },
    addListener(listener: (buf: ArrayBuffer) => void) {
      listeners.push(listener)
    },
  }
}
