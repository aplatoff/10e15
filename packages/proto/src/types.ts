//

export type Method<P extends any[] = any, R = any> = string & { __params: P; __result: R }

export interface MethodCall<P extends any[], R> {
  method: Method<P, R>
  params: P
}

export interface ErrorCode {
  code: number
  message: string
}

export interface RpcMessage {
  protocol: string
}

export interface RpcRequest<P extends any[] = any[], R = any> extends MethodCall<P, R>, RpcMessage {
  id?: number
}

export interface RpcResult<T = any> extends RpcMessage {
  id: number
  result: T
}

export interface RpcError extends RpcMessage {
  id: number
  error: ErrorCode
}

export type RpcResponse<T = any> = RpcResult<T> | RpcError

export interface Client {
  postRequest(request: RpcRequest): void
  addResponseListener(listener: (res: RpcResponse) => void): void
}
