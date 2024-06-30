//

import type { PageNo } from 'model'
import type { Method } from './types'

type MethodMetadata = {
  method: Method<any, any>
  code: number
  payloadSize: number
}

const subscribeCode = 0x01

export const subscribe = 'subscribe' as Method<[PageNo], any>

export const metadata: Record<string, MethodMetadata> = {
  subscribe: {
    method: subscribe,
    code: subscribeCode,
    payloadSize: 4,
  },
}
