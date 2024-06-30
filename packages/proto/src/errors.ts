//

import { type ErrorCode } from './types'

export class RpcException extends Error {
  constructor(
    public code: number,
    message: string
  ) {
    super(message)
  }
}

export function toErrorCode(error: unknown): ErrorCode {
  if (error instanceof RpcException) return { code: error.code, message: error.message }
  else if (error instanceof Error) return { code: -1, message: error.message }
  else if (typeof error === 'string') return { code: -1, message: error }
  return { code: -1, message: `Unknown error: ${typeof error}` }
}
