//

import type { ServerWebSocket } from 'bun'
import type { PageNo, Time } from 'model'
import {
  encodeCheckboxToggled,
  encodeChunkData,
  encodeRequestPageDataResult,
  encodeToggleCheckboxResult,
  errorResponse,
  resultResponse,
} from 'proto'
import { createDb, dev, type Db } from './db'

type ClientData = {}

const welcomeMessage =
  'Welcome to the 10e15 checkboxes server!\nDid you tried our flagship product https://huly.io?\nAnd we are always hiring, check more at https://hardcoreeng.com'

const broadcastTopic = 'everyone'

const broadcast = (data: [id: number, payload: ArrayBufferLike]): ArrayBufferLike => {
  const payload = new Uint8Array(data[1])
  const buf = new Uint8Array(new ArrayBuffer(1 + payload.length))
  buf[0] = data[0]
  buf.set(payload, 1)
  return buf.buffer
}

async function handleToggleCheckbox(
  ws: ServerWebSocket<ClientData>,
  db: Db,
  message: Buffer
): Promise<ArrayBuffer | undefined> {
  const offset = message.readUint32BE(0)
  const page = message.readUint32BE(4) as PageNo
  const checkbox = { page, offset }
  const time = await db.toggle(checkbox)
  ws.publish(broadcastTopic, broadcast(encodeCheckboxToggled(checkbox, time)))
  return encodeToggleCheckboxResult(time)
}

async function handleRequestPageData(
  ws: ServerWebSocket<ClientData>,
  db: Db,
  message: Buffer
): Promise<ArrayBuffer | undefined> {
  const pageNo = message.readUint32BE(0) as PageNo
  console.log(`requesting page ${pageNo}`)
  const persistentTime = await db.requestChunkData(pageNo, (data, kind, chunk) => {
    console.log('sending transient chunk', chunk, 'of kind', kind, ', page', pageNo, 'to client')
    ws.send(broadcast(encodeChunkData(pageNo, chunk, kind, data)))
  })
  return encodeRequestPageDataResult(persistentTime)
}

const handlers = [handleToggleCheckbox, handleRequestPageData]
const pagesPath = '/pages/'
const pagesPathLength = pagesPath.length

export function createServer() {
  const db = createDb(dev, 0n as Time)

  const server = Bun.serve<ClientData>({
    fetch(req, server) {
      const url = new URL(req.url)
      if (url.pathname.startsWith(pagesPath)) {
        const pageCode = url.pathname.slice(pagesPathLength).split('-')
        const page = Number(pageCode[0]) as PageNo
        const time = BigInt(pageCode[1]) as Time
        console.log(`serving page data ${page} with time ${time}`)

        return new Response(db.getPage(pageNo))
      } else if (url.pathname === '/proto') {
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
          if (commandId < 0 && commandId >= handlers.length) return
          try {
            const result = await handlers[commandId](ws, db, message.subarray(4))
            ws.send(resultResponse(requestId, result))
          } catch (error) {
            console.error(error)
            ws.send(errorResponse(requestId, 0))
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
