//

import { CheckboxesPerPage } from 'model'

type ChunkKind = 'bitmap' | 'txes'

export interface BitStorage {
  toggle(offset: number): void // return true if full
  get(offset: number): number
}

export interface Chunk extends BitStorage {
  readonly kind: ChunkKind
  bytes(): number
  save(data: Uint16Array): void
  optimize(): Chunk // optimize to a more memory efficient storage
}

export interface Bitmap extends Chunk {
  readonly kind: 'bitmap'
  ones(): number
  toTxStorage(capacity: number): TxStorage
}

export interface TxStorage extends Chunk {
  readonly kind: 'txes'
  isFull(): boolean
  length(): number
  toBitmap(): Bitmap
  fromBitmap(bitmap: Bitmap): TxStorage
}

export interface Page extends BitStorage {
  serialize(): Uint16Array
}

// For efficiency, I'm limiting ChunkLength to 64K checkboxes per chunk
// Maximum occupied memory is 64Kbits = 8KB per page
const MaxChunkLength = 1 << 16
const BitmapSize = MaxChunkLength >>> 3
const MaxTxLength = BitmapSize >>> 1 // 4K checkboxes (optimized). More checkboxes will take more than Bitmap

export function createBitmap(): Bitmap {
  const data = new Uint16Array(BitmapSize)
  const get = (offset: number) => (data[offset >> 4] >> (offset & 15)) & 1
  let ones = 0
  const bitmap = {
    kind: 'bitmap' as const,
    toggle: (offset: number) => {
      ones += get(offset) ? -1 : 1
      data[offset >> 4] ^= 1 << (offset & 15)
    },
    get,
    ones: () => ones,
    toTxStorage: (capacity: number): TxStorage => createTxStorage(capacity).fromBitmap(bitmap),
    save: (buf: Uint16Array) => buf.set(data),
    bytes: () => BitmapSize,
    optimize: (): Chunk => (ones >= MaxTxLength ? bitmap : bitmap.toTxStorage(ones)),
  }
  return bitmap
}

// TxStorage simply logs operations
// it makes no sense to occupy more than 8K for txes
// actually we should stop at 4K byte and upgrade to BitMap
// this means we should upgrade after 2K txes (checkboxes) == 4K bytes

function createTxStorage(capacity: number): TxStorage {
  let data = new Uint16Array(capacity << 1)
  let size = 0

  const txes = {
    kind: 'txes' as const,
    toggle(offset: number) {
      data[size++] = offset
      return size === data.length
    },
    get(offset: number): number {
      let result = 0
      for (let i = 0; i < size; i++) if (data[i] === offset) result ^= 1
      return result
    },
    length: () => size,
    toBitmap: () => {
      const bitmap = createBitmap()
      for (let i = 0; i < size; i++) bitmap.toggle(data[i])
      return bitmap
    },
    fromBitmap: (bitmap: Bitmap) => {
      size = 0
      for (let i = 0; i < CheckboxesPerPage; i++) if (bitmap.get(i)) data[size++] = i
      return txes
    },
    isFull: () => size === data.length,
    save: (buf: Uint16Array) => {
      buf[0] = size
      buf.set(data, 1)
    },
    optimize: () => {
      const bitmap = txes.toBitmap()
      const ones = bitmap.ones()
      return ones < MaxTxLength ? (size === ones ? txes : bitmap.toTxStorage(ones)) : bitmap
    },
    bytes: () => (size + 1) << 1,
  }
  return txes
}

const ChunksPerPage = CheckboxesPerPage >> 16

// Serialized as Uint16Array
// [ nShunks, n1, n2, n3, ... ], n1, n2, n3 are type and order num of chunks
// type = 0: bitmap, 1: txStorage
// for tx:  [ size, data0, data1, ... ]
// for bitmap: [ data0, data1, ... ]

export function createPage(): Page {
  const chunks = new Array<Chunk | undefined>(ChunksPerPage)

  const getChunk = (n: number): Chunk => {
    const chunk = chunks[n]
    if (chunk) return chunk
    const newChunk = createTxStorage(4)
    chunks[n] = newChunk
    return newChunk
  }

  return {
    toggle(offset: number) {
      const n = offset >> 16
      const chunk = getChunk(n)
      chunk.toggle(offset & 0xffff)
      if (chunk.kind === 'txes') {
        const txes = chunk as TxStorage
        if (txes.isFull()) {
          const bitmap = txes.toBitmap()
          const size = bitmap.ones()
          chunks[n] = size > 1024 ? bitmap : bitmap.toTxStorage(size << 1)
        }
      }
      return false
    },
    get: (offset: number): number => getChunk(offset >> 16).get(offset & 0xffff),
    serialize: (): Uint16Array => {
      let size = 2 // nChunks
      let nChunks = 0
      for (let i = 0; i < ChunksPerPage; i++)
        if (chunks[i]) {
          chunks[i] = chunks[i]!.optimize()
          size += 2 + chunks[i]!.bytes()
          nChunks++
        }

      console.log('page size', size)
      const result = new Uint16Array(size)
      result[0] = nChunks

      let offset = 1
      for (let i = 0; i < ChunksPerPage; i++) {
        if (chunks[i]) {
          const chunk = chunks[i]!
          if (chunk.kind === 'bitmap') {
            result[offset++] = i
            chunk.save(result.subarray(offset))
            offset += BitmapSize
          } else {
            const txes = chunk as TxStorage
            result[offset++] = i | 0x80
            txes.save(result.subarray(offset))
            offset += txes.length() + 1
          }
        }
      }
      return result
    },
  }
}
