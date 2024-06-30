//

import type { Checkbox, PageNo } from 'model'

type Config = {
  drives: number
  paths: string[]
  memory: number
}

const production = {
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

type Page = {
  state: PageState
}

export interface Db {
  toggle(checkbox: Checkbox): Promise<void>
}

const name = (value: number, pad: number) => value.toString(16).padStart(pad, '0')

async function createPage(pageNo: PageNo): Promise<Page> {
  const drive = pageNo & ((1 << production.driveBits) - 1)
  const fileNo = pageNo >>> production.driveBits
  const root = fileNo & 0xff
  const subfolder = (root >>> 8) & 0xff
  const file = fileNo >>> 16

  const path = `${production.paths[drive]}/${name(root, 2)}/${name(subfolder, 2)}/${name(file, 2)}`
  console.log('path', pageNo, path)

  const meta = Bun.file(`${path}.meta`)
  const exists = await meta.exists()
  if (!exists) {
    return {
      state: PageState.Empty,
    }
  }

  throw new Error('Not implemented')
}

export function createDb(config: Config): Db {
  const pages = new Map<PageNo, Page>()

  return {
    async toggle(checkbox: Checkbox): Promise<void> {
      let page = pages.get(checkbox.page)
      if (page === undefined) {
        page = await createPage(checkbox.page)
        pages.set(checkbox.page, page)
      }
    },
  }
}
