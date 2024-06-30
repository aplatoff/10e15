//

import { decoders, HeaderSize, methods, protocol, RpcException, type RpcRequest } from 'proto'
import { handlers } from './handlers'

type Header = number & { __tag: 'header' }

const codeFromHeader = (header: Header) => header >>> 24
const idFromHeader = (header: Header) => header & 0x00ffffff

function decodeMessage(message: Buffer): RpcRequest {
  console.log(`message size: ${message.length}`)
  const header = message.readUInt32BE(0) as Header
  const code = codeFromHeader(header)
  const method = methods[code]
  if (method === undefined) throw new RpcException(1, `unknown method code: ${code}`)

  const payload = Buffer.from(message.buffer, HeaderSize)
  const decoder = decoders[code]
  const params = decoder(payload)
  const id = idFromHeader(header)

  return { method: method.code, params, id, protocol }
}

function processMessage(message: Buffer) {
  const request = decodeMessage(message)
  const handler = handlers[request.method]
  return handler(request)
}

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
        // server.publish('the-group-chat', msg)
      },
      message(ws, message) {
        if (typeof message === 'string') {
          console.log(`received message: ${message}`)
        } else {
          processMessage(message as Buffer)
        }
      },
      close(ws) {
        // const msg = `${ws.data.username} has left the chat`
        ws.unsubscribe(broadcastTopic)
        // server.publish('the-group-chat', msg)
      },
    },
  })

  console.log(`Listening on ${server.hostname}:${server.port}`)
}
