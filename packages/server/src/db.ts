//

import { LRUCache } from 'lru-cache'
import type { Checkbox, PageNo, Time } from 'model'
import { mkdir } from 'node:fs/promises'
import { Page, PersistentPage, type ChunkKind } from 'proto'

type Config = {
  driveBits: number
  paths: string[]
  memory: number
  maxTransientCache: number
  maxPersistentCache: number
}

export const production: Config = {
  driveBits: 4,
  paths: [
    '/mnt/disk0',
    '/mnt/disk1',
    '/mnt/disk2',
    '/mnt/disk3',
    '/mnt/disk4',
    '/mnt/disk5',
    '/mnt/disk6',
    '/mnt/disk7',
    '/mnt/disk8',
    '/mnt/disk9',
    '/mnt/diska',
    '/mnt/diskb',
    '/mnt/diskc',
    '/mnt/diskd',
    '/mnt/diske',
    '/mnt/diskf',
  ],
  memory: 64 * 1024, // MB
  maxTransientCache: 16 * 1024,
  maxPersistentCache: 1 << 20,
}

export const dev: Config = {
  driveBits: 0,
  paths: ['/tmp/10e15'],
  memory: 1 * 1024, // MB
  maxTransientCache: 20000,
  maxPersistentCache: 20000,
}

export interface Db {
  toggle(checkbox: Checkbox): Promise<Time>
  requestChunkData(
    page: PageNo,
    send: (data: ArrayBufferLike, kind: ChunkKind, chunk: number) => void
  ): Promise<Time>
}

const name = (value: number, pad: number) => value.toString(16).padStart(pad, '0')

type PersistentPageDesciptor = {
  readonly time: Time
}

export function createDb(config: Config, time: Time): Db {
  let globalTime = time

  const transientPages = new LRUCache<PageNo, Page>({
    max: config.maxTransientCache,
    dispose: async (page, pageNo) => {
      const path = getPath(pageNo)
      console.log('save page', pageNo, 'to', path)

      let persistentPage: PersistentPage | null = null
      const descriptor = await getPageDesciptor(pageNo)
      if (descriptor.time !== 0n) {
        const file = Bun.file(path.join('/'))
        persistentPage = new PersistentPage()
        persistentPage.loadFromBuffer(await file.arrayBuffer())
      } else persistentPage = new PersistentPage()

      await mkdir(path[0], { recursive: true })

      const writer = Bun.file(path.join('/')).writer()
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

      Bun.write(path.join('/') + '.meta', persistentPage.getTime().toString())
    },
  })

  const persistentPages = new LRUCache<PageNo, PersistentPageDesciptor>({
    max: config.maxPersistentCache,
  })

  function getPath(pageNo: PageNo) {
    const drive = pageNo & ((1 << config.driveBits) - 1)
    const fileNo = pageNo >>> config.driveBits
    const root = fileNo & 0xff
    const subfolder = (root >>> 8) & 0xff
    const file = fileNo >>> 16

    return [`${config.paths[drive]}/${name(root, 2)}/${name(subfolder, 2)}`, `${name(file, 3)}`]
  }

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
  }
}
