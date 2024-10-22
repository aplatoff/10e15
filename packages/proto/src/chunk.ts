//

import { CheckboxesPerPage } from 'model'

export type ChunkKind = 0x00 | 0x01

export const BitmapChunk = 0x00 as ChunkKind
export const TxChunk = 0x01 as ChunkKind

export interface Chunk {
  kind(): ChunkKind
  toggle(offset: number): void
  get(offset: number): number
  isFull(): boolean
  bytes(): number
  save(): Uint16Array
  load(buf: Uint16Array): number
  optimize(): Chunk
  print(): void
  toBitmap(): Bitmap
}

export interface Bitmap extends Chunk {
  ones(): number
  toTxStorage(capacity: number): TxStorage
  toBitmapData(): Uint16Array
}

export interface TxStorage extends Chunk {
  // length(): number
  fromBitmap(bitmap: Bitmap): TxStorage // make it fromBitmapData later, optimize
}

// export interface Page {
//   toggle(offset: number, time: bigint): void
//   get(offset: number): number
//   getTime(): bigint
//   save(sink: (data: ArrayBufferLike, n: number) => void): void
//   loadChunk(buf: ArrayBufferLike, n: number): void
// }

// interface TransientPage extends Page {
//   mergeChunk(bitmapData: Uint16Array, n: number): void
// }

// For efficiency, I'm limiting ChunkLength to 64K checkboxes per chunk
// Maximum occupied memory is 64Kbits = 8KB per page
const MaxChunkLength = 1 << 16
const BitmapSize16Bits = MaxChunkLength >>> 4
const MaxTxLength = BitmapSize16Bits // 4K checkboxes (optimized). More checkboxes will take more space than Bitmap

export function createBitmapFromData(data: Uint16Array): Bitmap {
  const get = (offset: number) => (data[offset >> 4] >> (offset & 15)) & 1
  let ones = 0
  const bitmap = {
    kind: () => BitmapChunk,
    toggle: (offset: number) => {
      ones += get(offset) ? -1 : 1
      data[offset >> 4] ^= 1 << (offset & 15)
    },
    get,
    ones: () => ones,
    toTxStorage: (capacity: number): TxStorage => createTxStorage(capacity).fromBitmap(bitmap),
    save: (): Uint16Array => {
      const buf = new Uint16Array(BitmapSize16Bits)
      buf.set(data)
      return buf
    },
    load: (buf: Uint16Array): number => {
      data.set(buf)
      return BitmapSize16Bits << 1
    },
    bytes: () => BitmapSize16Bits << 1,
    optimize: (): Chunk => (ones >= MaxTxLength ? bitmap : bitmap.toTxStorage(ones)),
    print: () => console.log('bitmap'),
    toBitmap: () => bitmap,
    toBitmapData: () => data,
    isFull: () => false,
  }
  return bitmap
}

export const createBitmap = () => createBitmapFromData(new Uint16Array(BitmapSize16Bits))

export function mergeBitmapData(a: Uint16Array, b: Uint16Array): Bitmap {
  const data = new Uint16Array(BitmapSize16Bits)
  for (let i = 0; i < BitmapSize16Bits; i++) data[i] = a[i] ^ b[i]
  return createBitmapFromData(data)
}

// TxStorage simply logs operations
// it makes no sense to occupy more than 8K for txes
// actually we should stop at 4K byte and upgrade to BitMap
// this means we should upgrade after 2K txes (checkboxes) == 4K bytes

export function createTxStorage(capacity: number): TxStorage {
  let data = new Uint16Array(capacity << 1)
  let size = 0
  let optimized = true

  const txes = {
    kind: () => TxChunk,
    toggle(offset: number) {
      data[size++] = offset
      optimized = false
    },
    get(offset: number): number {
      let result = 0
      for (let i = 0; i < size; i++) if (data[i] === offset) result ^= 1
      return result
    },
    // length: () => size,
    toBitmap: () => {
      const bitmap = createBitmap()
      for (let i = 0; i < size; i++) bitmap.toggle(data[i])
      return bitmap
    },
    toBitmapData: () => txes.toBitmap().toBitmapData(),
    fromBitmap: (bitmap: Bitmap) => {
      size = 0
      for (let i = 0; i < CheckboxesPerPage; i++) if (bitmap.get(i)) data[size++] = i
      optimized = true
      return txes
    },
    isFull: () => size === data.length,
    save: (): Uint16Array => {
      const buf = new Uint16Array(size + 1)
      buf[0] = size
      buf.set(data.subarray(0, size), 1)
      return buf
    },
    load: (buf: Uint16Array) => {
      size = buf[0]
      console.log('load txes', buf.length, size)
      data = new Uint16Array(size)
      data.set(buf.subarray(1, size + 1))
      return (size + 1) << 1
    },
    optimize: () => {
      if (optimized) return txes // assume full is optimized, which is not always true
      const bitmap = txes.toBitmap()
      const ones = bitmap.ones()
      return ones < MaxTxLength ? (size === ones ? txes : bitmap.toTxStorage(ones)) : bitmap
    },
    bytes: () => (size + 1) << 1,
    print: () => console.log('txes', size, data),
  }
  return txes
}
