//

import { LRUCache } from 'lru-cache'
import type { PageNo } from 'model'
import { Page, PersistentPage, type ChunkKind } from 'proto'

type Config = {
  driveBits: number
  paths: string[]
  memory: number
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
}

export const dev: Config = {
  driveBits: 0,
  paths: ['/tmp'],
  memory: 1 * 1024, // MB
}

export interface Db {
  toggle(page: PageNo, offset: number): Promise<bigint>
  save(
    page: PageNo,
    send: (data: ArrayBufferLike, kind: ChunkKind, chunk: number) => void
  ): Promise<void>
}

const name = (value: number, pad: number) => value.toString(16).padStart(pad, '0')

export function createDb(config: Config, time: bigint): Db {
  let globalTime = time

  const pages = new LRUCache<PageNo, PersistentPage>({
    max: 2,
    dispose: (page, key) => {
      console.log('save page', key, 'to', getPath(key))
      page.optimize((chunk, n) => {
        console.log('save chunk', n, chunk.kind())
      })
    },
  })

  function getPath(pageNo: PageNo) {
    const drive = pageNo & ((1 << config.driveBits) - 1)
    const fileNo = pageNo >>> config.driveBits
    const root = fileNo & 0xff
    const subfolder = (root >>> 8) & 0xff
    const file = fileNo >>> 16

    return `${config.paths[drive]}/${name(root, 2)}/${name(subfolder, 2)}/${name(file, 3)}`
  }

  async function loadPersistentPage(pageNo: PageNo): Promise<PersistentPage> {
    const path = getPath(pageNo)
    console.log('path', pageNo, path)

    const meta = Bun.file(`${path}.meta`)
    const exists = await meta.exists()
    if (!exists) {
      return new PersistentPage(new Page())
    }

    throw new Error('Not implemented')
  }

  async function getPage(pageNo: PageNo): Promise<PersistentPage> {
    const page = pages.get(pageNo)
    if (page === undefined) {
      const page = await loadPersistentPage(pageNo)
      pages.set(pageNo, page)
      return page
    }
    return page
  }

  return {
    async toggle(pageNo: PageNo, offset: number): Promise<bigint> {
      const page = await getPage(pageNo)
      globalTime = globalTime + 1n
      page.toggle(offset, globalTime)
      console.log('time', globalTime)
      return globalTime
    },
    async save(
      pageNo: PageNo,
      send: (data: ArrayBufferLike, kind: ChunkKind, chunk: number) => void
    ): Promise<void> {
      const page = await getPage(pageNo)
      page.optimize((chunk, n) => send(chunk.save().buffer, chunk.kind(), n))
    },
  }
}
