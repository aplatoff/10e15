//

import { LRUCache } from 'lru-cache'
import type { Checkbox, PageNo, Time } from 'model'
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
  toggle(checkbox: Checkbox): Promise<Time>
  requestChunkData(
    page: PageNo,
    send: (data: ArrayBufferLike, kind: ChunkKind, chunk: number) => void
  ): Promise<Time>
}

const name = (value: number, pad: number) => value.toString(16).padStart(pad, '0')

class ServerPersistentPage extends PersistentPage {
  constructor() {
    super(new Page())
  }
  async sendTransientData(
    send: (data: ArrayBufferLike, kind: ChunkKind, chunk: number) => void
  ): Promise<void> {
    this.transient.optimize((chunk, n) => send(chunk.save().buffer, chunk.kind(), n))
  }
}

export function createDb(config: Config, time: Time): Db {
  let globalTime = time

  const pages = new LRUCache<PageNo, ServerPersistentPage>({
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

  async function loadPersistentPage(pageNo: PageNo): Promise<ServerPersistentPage> {
    const path = getPath(pageNo)
    console.log('path', pageNo, path)

    const meta = Bun.file(`${path}.meta`)
    const exists = await meta.exists()
    if (!exists) {
      return new ServerPersistentPage()
    }

    throw new Error('Not implemented')
  }

  async function getPage(pageNo: PageNo): Promise<ServerPersistentPage> {
    const page = pages.get(pageNo)
    if (page === undefined) {
      const page = await loadPersistentPage(pageNo)
      pages.set(pageNo, page)
      return page
    }
    return page
  }

  return {
    async toggle(checkbox: Checkbox): Promise<Time> {
      const page = await getPage(checkbox.page)
      globalTime = (globalTime + 1n) as Time
      page.toggle(checkbox.offset, globalTime)
      console.log('time', globalTime)
      return globalTime as Time
    },
    async requestChunkData(
      pageNo: PageNo,
      send: (data: ArrayBufferLike, kind: ChunkKind, chunk: number) => void
    ): Promise<Time> {
      const page = await getPage(pageNo)
      const time = page.getTime()
      page.sendTransientData(send)
      return time
    },
  }
}
