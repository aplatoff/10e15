//

import type { Checkbox, PageNo } from 'model'
import { HeaderSize, methods, parseHeader, protocol, RpcException, type RpcRequest } from 'proto'

function toggleDecoder(buf: Buffer): [Checkbox] {
  const page = buf.readUInt32BE(0) as PageNo
  const offset = buf.readUInt32BE(4)
  return [{ page, offset }]
}
const subscribeDecoder = (buf: Buffer): [PageNo] => [buf.readUInt32BE() as PageNo]

const decoders = [toggleDecoder, subscribeDecoder]

export function decodeRequest(message: Buffer): RpcRequest {
  console.log(`message size: ${message.length}`)
  const { tag, id } = parseHeader(message.readUInt32BE(0))
  const method = methods[tag]
  if (method === undefined) throw new RpcException(1, `unknown method code: ${tag}`)

  const payload = Buffer.from(message.buffer, HeaderSize)
  const decoder = decoders[tag]
  const params = decoder(payload)

  return { method: method.code, params, id, protocol }
}
