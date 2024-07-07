//

import { LRUCache } from 'lru-cache'
import { Checkbox, type PageNo, type Time } from 'model'
import {
  CheckboxToggled,
  ChunkData,
  decodeCheckboxToggled,
  decodeChunkData,
  decodeToggleCheckbox,
  encodeRequestPageData,
  encodeToggleCheckbox,
  Page,
  PersistentPage,
} from 'proto'
import { createServer } from './server'
import { type Server } from './types'

export interface Db {
  getPage(page: PageNo): Page
}

async function toggleOnServer(server: Server, checkbox: Checkbox): Promise<Time> {
  const response = await server.sendCommand(encodeToggleCheckbox(checkbox))
  return decodeToggleCheckbox(response)
}

class ClientPage extends Page {
  constructor(
    private readonly page: PageNo,
    private readonly server: Server,
    private readonly scheduleDraw: () => void
  ) {
    super()
  }

  toggle(offset: number, time: bigint) {
    super.toggle(offset, time)
    this.scheduleDraw()
  }

  optimisticToggle(offset: number) {
    this.doToggle(offset)

    toggleOnServer(this.server, { page: this.page, offset })
      .then(this.confirmToggle.bind(this))
      .catch((error) => {
        console.error('toggle error', error)
        this.doToggle(offset)
      })
  }
}

export function createDb(url: string, scheduleDraw: () => void): Db {
  const server = createServer(url, (updateId: number, payload: ArrayBuffer) => {
    switch (updateId) {
      case CheckboxToggled:
        const toggled = decodeCheckboxToggled(payload)
        getPage(toggled.page).toggle(toggled.offset, toggled.time)
        scheduleDraw()
        break
      case ChunkData:
        const data = decodeChunkData(payload)
        getPage(data.page).loadChunk(new Uint16Array(data.data), data.kind, data.chunk)
        scheduleDraw()
        break
      default:
        console.error('unknown update', updateId)
    }
  })

  const pageCache = new LRUCache<PageNo, Page>({
    max: 2,
    dispose: (value, key) => {
      console.log('dispose', key)
    },
  })

  function getPage(page: PageNo): Page {
    const cached = pageCache.get(page)
    if (cached !== undefined) return cached

    const newPage = new PersistentPage(new ClientPage(page, server, scheduleDraw))
    pageCache.set(page, newPage)

    server
      .sendCommand(encodeRequestPageData(page))
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
    getPage,
  }
}
