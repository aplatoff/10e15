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
  load(buf: Uint16Array): void
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
    load: (buf: Uint16Array) => data.set(buf),
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
      data = new Uint16Array(size)
      data.set(buf.subarray(1))
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

// const ChunksPerPage = CheckboxesPerPage >> 16

// export function createTransientPage(): TransientPage {
//   let globalTime = 0n
//   const chunks = new Array<Chunk | undefined>(ChunksPerPage)

//   const getChunk = (n: number): Chunk => {
//     const chunk = chunks[n]
//     if (chunk) return chunk
//     const newChunk = createTxStorage(4)
//     chunks[n] = newChunk
//     return newChunk
//   }

//   const saveChunk = (chunk: Chunk): ArrayBufferLike => {
//     const optimized = chunk.optimize()
//     const data = optimized.save()
//     const size = data.byteLength >>> 1
//     const buf = new Uint16Array(size + 1)
//     buf[0] = optimized.kind()
//     buf.set(new Uint16Array(data), 1)
//     return buf.buffer
//   }

//   return {
//     getTime: () => globalTime,
//     toggle(offset: number, time: bigint) {
//       const n = offset >> 16
//       let chunk = getChunk(n)
//       if (chunk.kind === 'txes') {
//         const txes = chunk as TxStorage
//         if (txes.isFull()) {
//           const bitmap = txes.toBitmap()
//           const size = bitmap.ones()
//           chunk = size > 1024 ? bitmap : bitmap.toTxStorage(size << 1)
//           chunks[n] = chunk
//         }
//       }
//       if (globalTime < time) globalTime = time
//       else if (time !== 0n) console.log('global time in the past', globalTime, time)
//       chunk.toggle(offset & 0xffff)
//     },
//     get: (offset: number): number => chunks[offset >>> 16]?.get(offset & 0xffff) ?? 0,
//     save: (sink: (data: ArrayBufferLike, n: number) => void) =>
//       chunks.forEach((chunk, i) => {
//         if (chunk) sink(saveChunk(chunk), i)
//       }),
//     loadChunk: (buf: ArrayBufferLike, n: number) => {
//       const data = new Uint16Array(buf)
//       const type = data[0]
//       const chunk = type === 0 ? createBitmap() : createTxStorage(0)
//       chunk.load(new Uint16Array(data.buffer, 2))
//       chunks[n] = chunk
//     },
//     mergeChunk: (bitmapData: Uint16Array, n: number) => {
//       const chunk = chunks[n]
//       chunks[n] = chunk
//         ? mergeBitmapData(chunk.toBitmap().toBitmapData(), bitmapData)
//         : createBitmapFromData(bitmapData).optimize()
//     },
//   }
// }

// export function createPersistentPage(): Page {
//   let transient = createTransientPage()
//   let persistent = createTransientPage()

//   return {
//     getTime: () => persistent.getTime(),
//     toggle(offset: number, time: bigint) {
//       transient.toggle(offset, time)
//     },
//     get: (offset: number): number => transient.get(offset) ^ persistent.get(offset),
//     save: (sink: (data: ArrayBufferLike, n: number) => void) => {
//       if (transient.getTime() !== 0n) {
//         persistent.setTime(transient.getTime())
//       }
//     },
//   }
// }
