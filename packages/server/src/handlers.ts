//

import { type CheckboxNo, type PageNo } from 'model'
import { type RpcRequest, type RpcResult, protocol } from 'proto'

const voidResult = (request: RpcRequest): RpcResult => ({
  protocol,
  id: request.id,
  result: undefined,
})

function toggle(request: RpcRequest<[CheckboxNo], void>): RpcResult {
  console.log('Toggling checkbox:', request.params[0])
  return voidResult(request)
}

function subscribe(request: RpcRequest<[PageNo], void>): RpcResult {
  console.log('Subscribe:', request.params[0])
  return voidResult(request)
}

export const handlers = [toggle, subscribe] as ((req: RpcRequest) => RpcResult)[]
