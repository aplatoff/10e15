//

import { type Checkbox, type PageNo } from 'model'

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
