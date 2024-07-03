//

import type { PageNo } from 'model'
import {
  RequestPageData,
  ToggleCheckbox,
  broadcastCheckboxToggled,
  errorResponse,
  resultResponse,
} from 'proto'
import { createDb, production } from './db'

type ClientData = {}

const welcomeMessage =
  'Welcome to the 10e15 checkboxes server!\nDid you tried our flagship product https://huly.io?\nAnd we are always hiring, check more at https://hardcoreeng.com'

const broadcastTopic = 'everyone'

export function createServer() {
  const db = createDb(production)

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
      async message(ws, message) {
        if (typeof message === 'string') {
          console.log(`received message: ${message}`)
        } else {
          const commandId = message.readUInt8(0)
          const requestId = (message.readUInt8(1) << 16) | message.readUint16BE(2)
          switch (commandId) {
            case ToggleCheckbox:
              const offset = message.readUint32BE(4)
              const page = message.readUint32BE(8) as PageNo
              try {
                await db.toggle(page, offset)
                ws.send(resultResponse(requestId))
                ws.publish(broadcastTopic, broadcastCheckboxToggled(page, offset))
              } catch (error) {
                console.error(error)
                ws.send(errorResponse(requestId, 0))
              }
              break
            case RequestPageData:
              const pageNo = message.readUint32BE(4) as PageNo
              const payload = await db.serialize(pageNo)
              ws.send(resultResponse(requestId, payload))
              break
            default:
              console.log('unknown command')
          }
        }
      },
      close(ws) {
        ws.unsubscribe(broadcastTopic)
      },
    },
  })

  console.log(`Listening on ${server.hostname}:${server.port}`)
}
