//

import { type Checkbox, type PageNo } from 'model'

// C O M M A N D S
export const ToggleCheckbox = 0x00
export const RequestPageData = 0x01

// U P D A T E S
export const CheckboxToggled = 0x80
export const ChunkData = 0x81

// R E S P O N S E S
export const ResultResponse = 0xfe
export const ErrorResponse = 0xff

export function encodeToggleCheckbox(checkbox: Checkbox): ArrayBufferLike {
  const payload = new DataView(new ArrayBuffer(8))
  payload.setUint32(0, checkbox.offset)
  payload.setUint32(4, checkbox.page)
  return payload.buffer
}

export function encodeRequestPageData(page: PageNo): ArrayBufferLike {
  const payload = new DataView(new ArrayBuffer(4))
  payload.setUint32(0, page)
  return payload.buffer
}

//

export function broadcastCheckboxToggled(
  page: PageNo,
  offset: number,
  time: bigint
): ArrayBufferLike {
  const broadcast = new DataView(new ArrayBuffer(16))
  broadcast.setUint8(0, CheckboxToggled)
  broadcast.setUint8(1, offset >>> 16)
  broadcast.setUint16(2, offset)
  broadcast.setUint32(4, page)
  broadcast.setBigUint64(8, time)
  return broadcast.buffer
}

export function broadcastChunkData(
  page: PageNo,
  chunk: number,
  data: ArrayBufferLike
): ArrayBufferLike {
  const broadcast = new DataView(new ArrayBuffer(6 + data.byteLength))
  broadcast.setUint8(0, ChunkData)
  broadcast.setUint8(1, chunk)
  broadcast.setUint32(4, page)
  new Uint8Array(broadcast.buffer).set(new Uint8Array(data), 6)
  return broadcast.buffer
}

//

export function resultResponse(id: number, result?: ArrayBuffer): ArrayBufferLike {
  const buffer = new ArrayBuffer(4 + (result === undefined ? 0 : result.byteLength))
  const response = new Uint8Array(buffer)
  response[0] = ResultResponse
  response[1] = id >>> 16
  response[2] = id >>> 8
  response[3] = id
  if (result !== undefined) response.set(new Uint8Array(result), 4)
  return response.buffer
}

export function errorResponse(id: number, code: number): ArrayBufferLike {
  const buffer = new ArrayBuffer(8)
  const response = new DataView(buffer)
  response.setUint8(0, ErrorResponse)
  response.setUint8(1, id >>> 16)
  response.setUint16(2, id)
  response.setUint32(4, code)
  return response.buffer
}
