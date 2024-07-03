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
  load(buf: Uint16Array): number // return the number of 16bit words consumed
  save(data: Uint16Array): void
  optimize(): Chunk // optimize to a more memory efficient storage
  print(): void
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
  optimize(): number // optimize for storage and return the number of bytes to save content
  serialize(buf: Uint16Array): void
  load(buf: Uint16Array): void
}

// For efficiency, I'm limiting ChunkLength to 64K checkboxes per chunk
// Maximum occupied memory is 64Kbits = 8KB per page
const MaxChunkLength = 1 << 16
const BitmapSize16Bits = MaxChunkLength >>> 4
const MaxTxLength = BitmapSize16Bits // 4K checkboxes (optimized). More checkboxes will take more space than Bitmap

export function createBitmap(): Bitmap {
  const data = new Uint16Array(BitmapSize16Bits)
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
    load: (buf: Uint16Array): number => {
      data.set(buf)
      return BitmapSize16Bits
    },
    bytes: () => BitmapSize16Bits << 1,
    optimize: (): Chunk => (ones >= MaxTxLength ? bitmap : bitmap.toTxStorage(ones)),
    print: () => console.log('bitmap'),
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
      console.log('txes', offset, size)
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
      buf.set(data.subarray(0, size), 1)
    },
    load: (buf: Uint16Array): number => {
      size = buf[0]
      data = new Uint16Array(size)
      data.set(buf.subarray(1))
      return size + 1
    },
    optimize: () => {
      const bitmap = txes.toBitmap()
      const ones = bitmap.ones()
      return ones < MaxTxLength ? (size === ones ? txes : bitmap.toTxStorage(ones)) : bitmap
    },
    bytes: () => (size + 1) << 1,
    print: () => console.log('txes', size, data),
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
    serialize: (result: Uint16Array) => {
      let offset = 1
      let nChunks = 0
      for (let i = 0; i < ChunksPerPage; i++) {
        if (chunks[i]) {
          nChunks++
          const chunk = chunks[i]!
          result[offset++] = i | (chunk.kind === 'bitmap' ? 0 : 0x8000)
          chunk.save(result.subarray(offset))
          offset += chunk.bytes() >> 1
        }
      }
      if (nChunks > 0) result[0] = nChunks
      return result
    },
    load: (buf: Uint16Array) => {
      const nChunks = buf[0]
      let offset = 1
      for (let i = 0; i < nChunks; i++) {
        const header = buf[offset++]
        const n = header & 0xff
        const chunk = (header & 0x8000) === 0x8000 ? createTxStorage(0) : createBitmap()
        offset += chunk.load(buf.subarray(offset))
        console.log('loaded', n)
        chunk.print()
        chunks[n] = chunk
      }
    },
    optimize: (): number => {
      let size = 0
      for (let i = 0; i < ChunksPerPage; i++)
        if (chunks[i]) {
          chunks[i] = chunks[i]!.optimize()
          size += 2 + chunks[i]!.bytes()
        }
      return size > 0 ? size + 2 : 0
    },
  }
}
