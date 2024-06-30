//

import { encodeResponse, toggle } from 'proto'
import { decodeRequest } from './decode'
import { handlers } from './handlers'

type ClientData = {}

const welcomeMessage =
  'Welcome to the 10e15 checkboxes server!\nDid you tried our flagship product https://huly.io?\nAnd we are always hiring, check more at https://hardcoreeng.com'

const broadcastTopic = 'everyone'

export function createServer() {
  const server = Bun.serve<ClientData>({
    fetch(req, server) {
      const url = new URL(req.url)
      if (url.pathname === '/proto') {
        console.log(`upgrade!`)
        const success = server.upgrade(req, { data: {} })
        return success ? undefined : new Response('WebSocket upgrade error', { status: 400 })
      }
      return new Response(welcomeMessage)
    },
    websocket: {
      open(ws) {
        ws.subscribe(broadcastTopic)
        console.log(`new connection`)
      },
      message(ws, message) {
        if (typeof message === 'string') {
          console.log(`received message: ${message}`)
        } else {
          const request = decodeRequest(message)
          if (request.method === toggle.code) ws.publish(broadcastTopic, message)

          const handler = handlers[request.method]
          const response = handler(request)
          ws.send(encodeResponse(response))
        }
      },
      close(ws) {
        ws.unsubscribe(broadcastTopic)
      },
    },
  })

  console.log(`Listening on ${server.hostname}:${server.port}`)
}
