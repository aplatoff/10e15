//

import { type Checkbox, type PageNo } from 'model'
import { ResultTag } from './types'

export function writeHeader(view: DataView, code: number, id: number | undefined) {
  if (id !== undefined) view.setUint32(0, id)
  view.setUint8(0, code)
}

function toggleEncoder(view: DataView, checkbox: Checkbox) {
  view.setUint32(0, checkbox.page)
  view.setUint32(4, checkbox.offset)
}

function subscribeEncoder(view: DataView, pageNo: PageNo) {
  view.setUint32(0, pageNo)
}

export const encoders: ((view: DataView, ...params: any[]) => void)[] = [
  toggleEncoder,
  subscribeEncoder,
]

export function encodeResult(id: number, result: ArrayBuffer): ArrayBuffer {
  const buf = new ArrayBuffer(4 + result.byteLength)
  const uint8 = new Uint8Array(buf)
  uint8[0] = ResultTag
  uint8[1] = id >> 16
  uint8[2] = id >> 8
  uint8[3] = id
  uint8.set(new Uint8Array(result), 4)
  return buf
}
