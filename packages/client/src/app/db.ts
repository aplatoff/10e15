//

import { LRUCache } from 'lru-cache'
import { Checkbox, type PageNo } from 'model'
import {
  CheckboxToggled,
  ChunkData,
  createPage,
  encodeRequestPageData,
  encodeToggleCheckbox,
  RequestPageData,
  ToggleCheckbox,
  type Page,
} from 'proto'
import { createServer } from './server'

export interface Db {
  toggle(checkbox: Checkbox): void
  get(checkbox: Checkbox): number
  getTime(): bigint
}

export function createDb(url: string, scheduleDraw: () => void): Db {
  let time = 0n

  const server = createServer(url, (updateId: number, payload: ArrayBuffer) => {
    const view = new DataView(payload)
    switch (updateId) {
      case CheckboxToggled:
        const offset = (view.getUint8(0) << 16) | view.getUint16(1)
        const pageNo = view.getUint32(3) as PageNo
        time = view.getBigUint64(7)
        const page = getPage(pageNo)
        page.toggle(offset)
        scheduleDraw()
        break
      case ChunkData:
        const chunk = view.getUint8(0)
        const i = view.getUint32(1) as PageNo
        const pg = getPage(i)
        pg.loadChunk(payload.slice(5), chunk)
        scheduleDraw()
        break
      default:
        console.error('unknown update', updateId)
    }
  })

  const pageCache = new LRUCache<PageNo, Page>({ max: 128 })

  function getPage(page: PageNo): Page {
    const cached = pageCache.get(page)
    if (cached !== undefined) return cached

    const newPage = createPage()
    pageCache.set(page, newPage)

    server
      .sendCommand(RequestPageData, encodeRequestPageData(page))
      .then((result) => {
        console.log('subscribed to', page, result)
        // newPage.load(new Uint16Array(result))
        // scheduleDraw()
      })
      .catch((error) => {
        console.error('error subscribing to', page, error)
      })

    return newPage
  }

  return {
    getTime: () => time,
    toggle(checkbox: Checkbox) {
      const page = getPage(checkbox.page)
      page.toggle(checkbox.offset)
      ++time
      scheduleDraw()

      server.sendCommand(ToggleCheckbox, encodeToggleCheckbox(checkbox)).catch((error) => {
        page.toggle(checkbox.offset) // revert
        console.error('error toggling', checkbox, error)
        scheduleDraw()
      })
    },
    get(checkbox: Checkbox): number {
      const page = getPage(checkbox.page)
      return page.get(checkbox.offset)
    },
  }
}
