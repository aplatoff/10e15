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
  protected globalTime: Time = 0n as Time
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

  protected confirmToggle(time: Time): void {
    if (this.globalTime < time) this.globalTime = time
    else console.error('toggle confirmed: time in the past', this.globalTime, time)
  }

  public toggle(offset: number, time: Time) {
    this.doToggle(offset)
    this.confirmToggle(time)
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

  public loadChunk(buf: Uint16Array, kind: ChunkKind, n: number) {
    const chunk = kind === BitmapChunk ? createBitmap() : createTxStorage(0)
    chunk.load(buf)
    this.chunks[n] = chunk
  }
}

// P E R S I S T E N T   P A G E

export class PersistentPage extends Page {
  constructor(protected transient: Page) {
    super()
  }

  public toggle(offset: number, time: Time) {
    this.transient.toggle(offset, time)
  }

  // public getTime() {
  //   const transientTime = this.transient.getTime()
  //   return transientTime !== 0n ? transientTime : super.getTime()
  // }

  public get(offset: number) {
    return this.transient.get(offset) ^ super.get(offset)
  }

  public optimize(sink: (chunk: Chunk, n: number) => void): void {
    const transientTime = this.transient.getTime()
    console.log('optimize, transient time', transientTime, 'global time', this.globalTime)
    if (transientTime !== 0n) {
      this.transient.optimize((chunk, n) => {
        if (this.chunks[n]) {
          const merged = mergeBitmapData(
            chunk.toBitmap().toBitmapData(),
            this.chunks[n].toBitmap().toBitmapData()
          )
          this.chunks[n] = merged.optimize()
        } else this.chunks[n] = chunk
      })
      this.globalTime = transientTime
    }
    super.optimize(sink)
  }
}
