//

import {
  type Client,
  type ErrorCode,
  type Method,
  protocol,
  type RpcError,
  type RpcRequest,
  type RpcResponse,
  type RpcResult,
  toErrorCode,
} from 'proto'

//import { createTransport } from './client-worker'
import { createClient } from 'proto'

const transport: Client = createClient()

type Callbacks = [(value: any) => void, (error: ErrorCode) => void]

transport.addResponseListener((response: RpcResponse) => {
  console.log('Received reponse from service worker:', response)
  const callbacks = requests.get(response.id)
  if (callbacks) {
    const [resolve, reject] = callbacks
    requests.delete(response.id)
    if ('error' in response) reject((response as RpcError).error)
    else resolve((response as RpcResult).result)
  } else console.error('No request found for response:', response)
})

const requests = new Map<number, Callbacks>()

const postRequest = async <P extends any[], R>(req: RpcRequest<P, R>): Promise<R> =>
  new Promise((resolve, reject) => {
    if (req.id !== undefined) requests.set(req.id, [resolve, reject])
    try {
      transport.postRequest(req)
    } catch (error) {
      reject(toErrorCode(error))
    }
  })

let lastId = 0

export const request = <P extends any[], R>(method: Method<P, R>, ...params: P): Promise<R> =>
  postRequest({ protocol, id: ++lastId, method: method.code, params })
