//

import type { PageNo } from 'model'
import { type Page, createPage } from 'proto'

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
    '/mnt/diska',
    '/mnt/diskb',
    '/mnt/diskc',
    '/mnt/diskd',
    '/mnt/diske',
    '/mnt/diskf',
  ],
  memory: 64 * 1024, // MB
}

enum PageState {
  Empty,
}

type PageDescriptor = {
  state: PageState
  transient: Page
}

export interface Db {
  toggle(page: PageNo, offset: number): Promise<void> // queue in the future
  serialize(page: PageNo): Promise<ArrayBuffer>
}

const name = (value: number, pad: number) => value.toString(16).padStart(pad, '0')

export function createDb(config: Config): Db {
  const pages = new Map<PageNo, PageDescriptor>()

  async function createPageDescriptor(pageNo: PageNo): Promise<PageDescriptor> {
    const drive = pageNo & ((1 << config.driveBits) - 1)
    const fileNo = pageNo >>> config.driveBits
    const root = fileNo & 0xff
    const subfolder = (root >>> 8) & 0xff
    const file = fileNo >>> 16

    const path = `${config.paths[drive]}/${name(root, 2)}/${name(subfolder, 2)}/${name(file, 2)}`
    console.log('path', pageNo, path)

    const meta = Bun.file(`${path}.meta`)
    const exists = await meta.exists()
    if (!exists) {
      return {
        state: PageState.Empty,
        transient: createPage(),
      }
    }

    throw new Error('Not implemented')
  }

  async function getPage(page: PageNo): Promise<PageDescriptor> {
    const desc = pages.get(page)
    if (desc === undefined) {
      const desc = await createPageDescriptor(page)
      pages.set(page, desc)
      return desc
    }
    return desc
  }

  return {
    async toggle(pageNo: PageNo, offset: number): Promise<void> {
      const page = await getPage(pageNo)
      return page.transient.toggle(offset)
    },

    async serialize(n: PageNo): Promise<ArrayBuffer> {
      const desc = await getPage(n)
      const page = desc.transient
      const size = page.optimize()
      console.log('serialize page no', n, 'to buffer size (bytes)', size)

      const buf = new ArrayBuffer(size)
      page.serialize(new Uint16Array(buf))
      return buf
    },
  }
}
