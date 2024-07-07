//

import { type Checkbox, type PageNo, type Time } from 'model'
import type { ChunkKind } from './chunk'

// C O M M A N D S
const ToggleCheckbox = 0x00
const RequestPageData = 0x01

// U P D A T E S
export const CheckboxToggled = 0x80
export const ChunkData = 0x81

// R E S P O N S E S
export const ResultResponse = 0xfe
export const ErrorResponse = 0xff

// C O M M A N D S

export function encodeToggleCheckbox(checkbox: Checkbox): [id: number, payload: ArrayBufferLike] {
  const payload = new DataView(new ArrayBuffer(8))
  payload.setUint32(0, checkbox.offset)
  payload.setUint32(4, checkbox.page)
  return [ToggleCheckbox, payload.buffer]
}

export function decodeToggleCheckbox(payload: ArrayBuffer): Time {
  const view = new DataView(payload)
  return view.getBigUint64(0) as Time
}

export function encodeRequestPageData(page: PageNo): [id: number, payload: ArrayBufferLike] {
  const payload = new DataView(new ArrayBuffer(4))
  payload.setUint32(0, page)
  return [RequestPageData, payload.buffer]
}

// B R O A D C A S T S

export function encodeCheckboxToggled(
  page: PageNo,
  offset: number,
  time: bigint
): [id: number, ArrayBufferLike] {
  const broadcast = new DataView(new ArrayBuffer(16))
  broadcast.setUint32(0, offset)
  broadcast.setUint32(4, page)
  broadcast.setBigUint64(8, time)
  return [CheckboxToggled, broadcast.buffer]
}

export const decodeCheckboxToggled = (
  payload: ArrayBuffer
): { page: PageNo; offset: number; time: Time } => {
  const view = new DataView(payload)
  const offset = view.getUint32(0)
  const page = view.getUint32(4) as PageNo
  const time = view.getBigUint64(8) as Time
  return { page, offset, time }
}

export function encodeChunkData(
  page: PageNo,
  chunk: number,
  kind: ChunkKind,
  data: ArrayBufferLike
): [number, ArrayBufferLike] {
  const broadcast = new DataView(new ArrayBuffer(6 + data.byteLength))
  broadcast.setUint32(0, page)
  broadcast.setUint8(4, chunk)
  broadcast.setUint8(5, kind)
  new Uint8Array(broadcast.buffer).set(new Uint8Array(data), 6)
  return [ChunkData, broadcast.buffer]
}

export function decodeChunkData(payload: ArrayBuffer): {
  page: PageNo
  chunk: number
  kind: ChunkKind
  data: ArrayBuffer
} {
  const view = new DataView(payload)
  const page = view.getUint32(0) as PageNo
  const chunk = view.getUint8(4)
  const kind = view.getUint8(5) as ChunkKind
  const data = payload.slice(6)
  return { page, chunk, kind, data }
}

// R E S P O N S E S

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

//
