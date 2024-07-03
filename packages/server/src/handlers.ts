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

type HanderFunc = (db: Db, req: RpcRequest) => Promise<ArrayBuffer>

async function toggle(db: Db, request: RpcRequest<[Checkbox], void>): Promise<ArrayBuffer> {
  db.toggle(request.params[0])
  return new ArrayBuffer(0)
}

const subscribe = (db: Db, request: RpcRequest<[PageNo], void>): Promise<ArrayBuffer> =>
  db.serialize(request.params[0])

export const handlers = [toggle, subscribe] as HanderFunc[]
