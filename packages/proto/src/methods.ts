//

import type { Checkbox, PageNo } from 'model'
import type { Method } from './types'

// type MethodInfo<P extends any[], R> = {
//   method: Method<P, R>
//   payloadSize: number
// }

export const toggle = { code: 0x00, size: 0x08 } as Method<[Checkbox], void>
export const subscribe = { code: 0x01, size: 0x04 } as Method<[PageNo], void>

export const methods = [toggle, subscribe]
