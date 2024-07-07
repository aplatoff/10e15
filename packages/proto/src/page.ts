//

import { CheckboxesPerPage, type Time } from 'model'
import {
  BitmapChunk,
  type Chunk,
  type ChunkKind,
  createBitmap,
  createTxStorage,
  mergeBitmapData,
} from './chunk'

const CheckboxesPerChunk = 2n ** 16n
const ChunksPerPage = Number(CheckboxesPerPage / CheckboxesPerChunk)
console.log('Chunks per page', ChunksPerPage)

export class Page {
  private globalTime: Time = 0n as Time
  protected readonly chunks = new Array<Chunk | undefined>(ChunksPerPage)

  private getChunk(n: number): Chunk {
    const chunk = this.chunks[n]
    if (chunk) return chunk
    const newChunk = createTxStorage(4)
    this.chunks[n] = newChunk
    return newChunk
  }

  public getTime(): Time {
    return this.globalTime
  }

  protected doToggle(offset: number): void {
    const n = offset >> 16
    let chunk = this.getChunk(n)
    if (chunk.isFull()) {
      const bitmap = chunk.toBitmap()
      const size = bitmap.ones()
      chunk = size > 1024 ? bitmap : bitmap.toTxStorage(size << 1)
      this.chunks[n] = chunk
    }
    chunk.toggle(offset & 0xffff)
  }

  protected setTime(time: Time): void {
    if (this.globalTime < time) this.globalTime = time
    else console.error('toggle confirmed: time in the past', this.globalTime, time)
  }

  public toggle(offset: number, time: Time) {
    this.doToggle(offset)
    this.setTime(time)
  }

  public get(offset: number): number {
    return this.chunks[offset >>> 16]?.get(offset & 0xffff) ?? 0
  }

  public optimize(sink: (chunk: Chunk, n: number) => void): void {
    this.chunks.forEach((chunk, i) => {
      if (chunk) {
        const optimized = chunk.optimize()
        this.chunks[i] = optimized
        sink(optimized, i)
      }
    })
  }

  public loadChunk(buf: Uint16Array, kind: ChunkKind, n: number): number {
    const chunk = kind === BitmapChunk ? createBitmap() : createTxStorage(0)
    const bytes = chunk.load(buf)
    this.chunks[n] = chunk
    return bytes
  }
}

///

export class PersistentPage extends Page {
  protected doToggle() {
    throw new Error('not allowed')
  }

  public merge(page: Page) {
    console.log('merging page, time', page.getTime(), 'into', this.getTime())
    page.optimize((chunk, n) => {
      if (this.chunks[n]) {
        const merged = mergeBitmapData(
          chunk.toBitmap().toBitmapData(),
          this.chunks[n].toBitmap().toBitmapData()
        )
        this.chunks[n] = merged.optimize()
      } else this.chunks[n] = chunk
    })
    this.setTime(page.getTime())
  }

  public loadFromBuffer(buffer: ArrayBuffer) {
    const view = new DataView(buffer)
    let offset = 0
    while (true) {
      const n = view.getUint8(offset)
      if (n === 0xff) break
      const kind = view.getUint8(offset + 1)
      offset += 2
      offset += this.loadChunk(new Uint16Array(buffer, offset, n), kind as ChunkKind, n)
    }
  }
}
