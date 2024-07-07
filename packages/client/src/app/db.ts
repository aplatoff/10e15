//

import { LRUCache } from 'lru-cache'
import { Checkbox, type PageNo, type Time } from 'model'
import {
  CheckboxToggled,
  ChunkData,
  decodeCheckboxToggled,
  decodeChunkData,
  decodeRequestPageDataResult,
  decodeToggleCheckboxResult,
  encodeRequestPageData,
  encodeToggleCheckbox,
  Page,
  PersistentPage,
} from 'proto'
import { createServer } from './server'
import { type Server } from './types'

export interface Db {
  getPage(page: PageNo): Page
  getCheckbox(checkbox: Checkbox): number
  toggle(checkbox: Checkbox): void
}

async function toggleOnServer(server: Server, checkbox: Checkbox): Promise<Time> {
  const response = await server.sendCommand(encodeToggleCheckbox(checkbox))
  return decodeToggleCheckboxResult(response)
}

export function createDb(host: string, scheduleDraw: (time?: Time) => void): Db {
  const server = createServer(
    `ws://${host}:3000/proto`,
    (updateId: number, payload: ArrayBuffer) => {
      switch (updateId) {
        case CheckboxToggled:
          const toggled = decodeCheckboxToggled(payload)
          getPage(toggled.page).transient.toggle(toggled.offset, toggled.time)
          scheduleDraw(toggled.time)
          break
        case ChunkData:
          const data = decodeChunkData(payload)
          getPage(data.page).transient.loadChunk(new Uint16Array(data.data), data.kind, data.chunk)
          scheduleDraw()
          break
        default:
          console.error('unknown update', updateId)
      }
    }
  )

  class ClientPage extends Page {
    constructor(private readonly page: PageNo) {
      super()
    }

    toggle(offset: number, time: Time) {
      super.toggle(offset, time)
      scheduleDraw(time)
    }

    optimisticToggle(offset: number) {
      this.doToggle(offset)

      toggleOnServer(server, { page: this.page, offset })
        .then((time: Time) => {
          this.setTime(time)
          scheduleDraw(time)
        })
        .catch((error) => {
          console.error('toggle error', error)
          this.doToggle(offset)
          scheduleDraw()
        })
    }
  }

  const pageServer = `https://${host}:8000/pages/`

  class ClientPersistentPage extends PersistentPage {
    public readonly transient: ClientPage

    constructor(public readonly page: PageNo) {
      super()
      this.transient = new ClientPage(page)
    }

    public get(offset: number) {
      return this.transient.get(offset) ^ super.get(offset)
    }

    public async load() {
      console.log('loading transient page', this.page)
      const response = await server.sendCommand(encodeRequestPageData(this.page))
      const time = decodeRequestPageDataResult(response)
      if (this.getTime() !== time) {
        console.error('persistent page outdated', this.getTime(), time)
        const url = `${pageServer}${this.page}-${time}`
        console.log('fetching persistent page', url)
        try {
          const response = await fetch(url)
          if (!response.ok) throw new Error(`Response status: ${response.status}`)
          this.loadFromBuffer(await response.arrayBuffer())
        } catch (error) {
          console.error(error)
        }
      }
    }
  }

  const pageCache = new LRUCache<PageNo, ClientPersistentPage>({
    max: 2,
    dispose: (_, key) => {
      console.log('dispose', key)
    },
  })
  const screenCache: (ClientPersistentPage | undefined)[] = [undefined, undefined]

  function getCachedPage(page: PageNo): ClientPersistentPage | undefined {
    const screen = screenCache[page & 1]
    if (screen && screen.page === page) return screen
    const cached = pageCache.get(page)
    if (cached) {
      screenCache[page & 1] = cached
      return cached
    }
  }

  function loadPage(page: PageNo): ClientPersistentPage {
    console.log('loading page', page)
    const newPage = new ClientPersistentPage(page)
    screenCache[page & 1] = newPage
    pageCache.set(page, newPage)
    newPage.load()
    return newPage
  }

  const getPage = (page: PageNo): ClientPersistentPage => getCachedPage(page) ?? loadPage(page)

  return {
    getPage,
    getCheckbox(checkbox: Checkbox): number {
      const cached = getCachedPage(checkbox.page)
      if (cached) return cached.get(checkbox.offset)
      loadPage(checkbox.page)
      return 0
    },
    toggle(checkbox: Checkbox) {
      const page = getPage(checkbox.page)
      page.transient.optimisticToggle(checkbox.offset)
    },
  }
}
