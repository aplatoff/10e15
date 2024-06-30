//

import { type CheckboxNo, checkboxToPage, type PageNo } from 'model'

export function writeHeader(view: DataView, code: number, id: number | undefined) {
  if (id !== undefined) view.setUint32(0, id)
  view.setUint8(0, code)
}

function toggleEncoder(view: DataView, checkboxNo: CheckboxNo) {
  const [pageNo, checkbox] = checkboxToPage(checkboxNo)
  view.setUint32(0, pageNo)
  view.setUint32(4, checkbox)
}

function subscribeEncoder(view: DataView, pageNo: PageNo) {
  view.setUint32(0, pageNo)
}

export const encoders: ((view: DataView, ...params: any[]) => void)[] = [
  toggleEncoder,
  subscribeEncoder,
]
