//

import type { Checkbox, PageNo } from 'model'
import { HeaderSize, methods, parseHeader, protocol, RpcException, type RpcRequest } from 'proto'

function toggleDecoder(view: DataView): [Checkbox] {
  const page = view.getUint32(0) as PageNo
  const offset = view.getUint32(4)
  return [{ page, offset }]
}

const decoders = [toggleDecoder]

export function decodeRequest(buf: ArrayBuffer): RpcRequest {
  const view = new DataView(buf)
  const { tag, id } = parseHeader(view.getUint32(0))
  const method = methods[tag]
  if (method === undefined) throw new RpcException(1, `unknown method code: ${tag}`)

  const payload = new DataView(buf, HeaderSize)
  const decoder = decoders[tag]
  const params = decoder(payload)

  return { method: method.code, params, id, protocol }
}
