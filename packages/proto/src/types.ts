//

// Heasder format
//
// 1 byte = 0xff - error, 0xfe - result, 0x00 .. 0xfd - request

export const protocol = 'checkboxes-rpc-1.0'

export const HeaderSize = 4
export const ErrorTag = 0xff
export const ResultTag = 0xfe

export const parseHeader = (header: number) => ({
  tag: header >>> 24,
  id: header & 0x00ffffff,
})

export type MethodId<P extends any[] = any> = number & { __params: P }

export type Method<P extends any[] = any> = {
  code: MethodId<P>
  size: number
}

export interface MethodCall<P extends any[]> {
  method: MethodId<P>
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

export interface RpcRequest<P extends any[] = any[]> extends MethodCall<P>, RpcMessage {}

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
  addBroadcastListener(listener: (req: RpcRequest) => void): void
}
