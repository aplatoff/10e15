//

export const HeaderSize = 4

export type MethodId<P extends any[] = any, R = any> = number & { __params: P; __result: R }

export type Method<P extends any[] = any, R = any> = {
  code: MethodId<P, R>
  size: number
}

export interface MethodCall<P extends any[], R> {
  method: MethodId<P, R>
  params: P
}

export interface ErrorCode {
  code: number
  message: string
}

export interface RpcMessage {
  protocol: string
  id: number
}

export interface RpcRequest<P extends any[] = any[], R = any>
  extends MethodCall<P, R>,
    RpcMessage {}

export interface RpcResult<T = any> extends RpcMessage {
  result: T
}

export interface RpcError extends RpcMessage {
  error: ErrorCode
}

export type RpcResponse<T = any> = RpcResult<T> | RpcError

export interface Client {
  postRequest(request: RpcRequest): void
  addResponseListener(listener: (res: RpcResponse) => void): void
}
