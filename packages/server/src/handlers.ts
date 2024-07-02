//

import { type Checkbox, type PageNo } from 'model'
import { type RpcRequest } from 'proto'
import { type Db } from './db'

// const voidResult = (request: RpcRequest): RpcResult => ({
//   protocol,
//   id: request.id,
//   result: undefined,
// })

// const writeHeader = (buf: Uint32Array, id: number, payloadSize: number) => {
//   buf[0] = (id & 0x00ffffff) | (ResultTag << 24)
//   buf[1] = payloadSize
// }

type HanderFunc = (db: Db, req: RpcRequest) => Promise<ArrayBuffer | null>

async function toggle(db: Db, request: RpcRequest<[Checkbox], void>): Promise<ArrayBuffer | null> {
  db.toggle(request.params[0])
  // const result = new ArrayBuffer(8)
  // writeHeader(new Uint32Array(result, 0, HeaderSize), request.id, 0)
  // return result
  return null
}

const subscribe = (db: Db, request: RpcRequest<[PageNo], void>): Promise<ArrayBuffer | null> =>
  db.serialize(request.params[0])

export const handlers = [toggle, subscribe] as HanderFunc[]
