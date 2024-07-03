//

import { LRUCache } from 'lru-cache'
import { Checkbox, type PageNo } from 'model'
import {
  CheckboxToggled,
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
}

export function createDb(url: string, scheduleDraw: () => void): Db {
  const server = createServer(url, (updateId: number, payload: ArrayBuffer) => {
    switch (updateId) {
      case CheckboxToggled:
        const view = new DataView(payload)
        const offset = (view.getUint8(0) << 16) | view.getUint16(1)
        const pageNo = view.getUint32(3) as PageNo
        const page = getPage(pageNo)
        page.toggle(offset)
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
        newPage.load(new Uint16Array(result))
        scheduleDraw()
      })
      .catch((error) => {
        console.error('error subscribing to', page, error)
      })

    return newPage
  }

  return {
    toggle(checkbox: Checkbox) {
      const page = getPage(checkbox.page)
      page.toggle(checkbox.offset)
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
