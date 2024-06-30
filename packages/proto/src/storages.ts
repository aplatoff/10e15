//

import { CheckboxesPerPage } from 'model'

// For efficiency, I'm limiting BitStorage to 16 bits -- 64K checkboxes per storage
// Maximum occupied memory is 64Kbits = 8KB per page
const MaxBitStorage = 1 << 16

export interface BitStorage {
  toggle(offset: number): void // return true if full
  get(offset: number): number
}

export interface Chunk extends BitStorage {
  isFull(): boolean
  size(): number
  asBitmap(): Chunk
}

export function createBitmap(): Chunk {
  const data = new Uint8Array(MaxBitStorage >> 3)
  const get = (offset: number) => (data[offset >> 3] >> (offset & 7)) & 1
  let ones = 0
  const bitmap = {
    toggle: (offset: number) => {
      ones += get(offset) ? -1 : 1
      data[offset >> 3] ^= 1 << (offset & 7)
    },
    get,
    size: () => ones,
    asBitmap: () => bitmap,
    isFull: () => false,
  }
  return bitmap
}

// TxStorage simply logs operations
// it makes no sense to occupy more than 8K for txes
// actually we should stop at 4K byte and upgrade to BitMap
// this means we should upgrade after 2K txes (checkboxes) == 4K bytes

function createTxStorage(capacity: number): Chunk {
  let data = new Uint16Array(capacity << 1)
  let size = 0

  return {
    toggle(offset: number) {
      data[size++] = offset
      return size === data.length
    },
    get(offset: number): number {
      let result = 0
      for (let i = 0; i < size; i++) if (data[i] === offset) result ^= 1
      return result
    },
    size: () => size,
    asBitmap: () => {
      const bitmap = createBitmap()
      for (let i = 0; i < size; i++) bitmap.toggle(data[i])
      return bitmap
    },
    isFull: () => size === data.length,
  }
}

export function createBitStorage(): BitStorage {
  const chunks = new Array<Chunk | undefined>(CheckboxesPerPage >> 16)

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
      if (chunk.isFull()) {
        const bitmap = chunk.asBitmap()
        const size = bitmap.size()
        if (size < 1024) {
          const newChunk = createTxStorage(size << 1)
          for (let i = 0; i < CheckboxesPerPage; i++) if (bitmap.get(i)) newChunk.toggle(i)
          chunks[n] = newChunk
        } else {
          chunks[n] = bitmap
        }
      }
      return false
    },
    get: (offset: number): number => getChunk(offset >> 16).get(offset & 0xffff),
  }
}
