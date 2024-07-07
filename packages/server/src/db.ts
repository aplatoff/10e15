//

import { LRUCache } from 'lru-cache'
import type { Checkbox, PageNo, Time } from 'model'
import { mkdir } from 'node:fs/promises'
import { Page, PersistentPage, type ChunkKind } from 'proto'
import { config, getDir, getPath } from './config'

export interface Db {
  toggle(checkbox: Checkbox): Promise<Time>
  requestChunkData(
    page: PageNo,
    send: (data: ArrayBufferLike, kind: ChunkKind, chunk: number) => void
  ): Promise<Time>
  getTime(): Time
}

type PersistentPageDesciptor = {
  readonly time: Time
}

export function createDb(time: Time): Db {
  let globalTime = time

  const transientPages = new LRUCache<PageNo, Page>({
    max: config.maxTransientCache,
    dispose: async (page, pageNo) => {
      const path = getPath(pageNo)
      console.log('save page', pageNo, 'to', path)

      let persistentPage: PersistentPage | null = null
      const descriptor = await getPageDesciptor(pageNo)
      if (descriptor.time !== 0n) {
        console.log('loading persistent page to merge', pageNo, 'from', path)
        const file = Bun.file(path)
        persistentPage = new PersistentPage()
        persistentPage.loadFromBuffer(descriptor.time, await file.arrayBuffer())
      } else persistentPage = new PersistentPage()

      await mkdir(getDir(pageNo), { recursive: true })
      const writer = Bun.file(path).writer()
      const buf = new Uint8Array(2)
      persistentPage.merge(page)
      persistentPage.optimize((chunk, n) => {
        buf[0] = n
        buf[1] = chunk.kind()
        writer.write(buf)
        writer.write(chunk.save())
      })
      buf[0] = 0xff
      buf[1] = 0xff
      writer.write(buf)
      writer.end()

      const time = persistentPage.getTime()
      await Bun.write(path + '.meta', time.toString(10))
      persistentPages.set(pageNo, { time })
    },
  })

  const persistentPages = new LRUCache<PageNo, PersistentPageDesciptor>({
    max: config.maxPersistentCache,
  })

  async function getPageDesciptor(pageNo: PageNo): Promise<PersistentPageDesciptor> {
    const descriptor = persistentPages.get(pageNo)
    if (descriptor === undefined) {
      const descriptor = await createPageDescriptor(pageNo)
      persistentPages.set(pageNo, descriptor)
      return descriptor
    }
    return descriptor
  }

  async function createPageDescriptor(pageNo: PageNo): Promise<PersistentPageDesciptor> {
    const path = getPath(pageNo)
    console.log('creating page decriptor', pageNo, 'path', path)
    const meta = Bun.file(path + '.meta')
    const exists = await meta.exists()
    if (!exists) return { time: 0n as Time }
    const text = await meta.text()
    const time = BigInt(text) as Time
    console.log('found peristent page at ', time)
    return { time }
  }

  function getTransientPage(pageNo: PageNo): Page {
    const page = transientPages.get(pageNo)
    if (page === undefined) {
      const page = new Page()
      transientPages.set(pageNo, page)
      return page
    }
    return page
  }

  return {
    async toggle(checkbox: Checkbox): Promise<Time> {
      const page = getTransientPage(checkbox.page)
      globalTime = (globalTime + 1n) as Time
      page.toggle(checkbox.offset, globalTime)
      console.log('time', globalTime)
      return globalTime as Time
    },
    async requestChunkData(
      pageNo: PageNo,
      send: (data: ArrayBufferLike, kind: ChunkKind, chunk: number) => void
    ): Promise<Time> {
      const page = transientPages.get(pageNo)
      if (page !== undefined) {
        page.optimize((chunk, n) => send(chunk.save().buffer, chunk.kind(), n))
      }
      const descriptor = await getPageDesciptor(pageNo)
      return descriptor.time
    },
    getTime: () => globalTime,
  }
}
