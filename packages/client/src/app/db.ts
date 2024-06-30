//

import { LRUCache } from 'lru-cache'
import { type PageNo } from 'model'
import { type BitStorage, createBitStorage, subscribe, toggle } from 'proto'
import { request } from './client'

export interface Db {
  getPage(no: PageNo): BitStorage
}

function createPage(pageNo: PageNo): BitStorage {
  const storage = createBitStorage()

  request(subscribe, pageNo)
    .then((result) => {
      console.log('subscribed to', pageNo, result)
    })
    .catch((error) => {
      console.error('error subscribing to', pageNo, error)
    })

  return {
    get: (offset: number): number => storage.get(offset),
    toggle(offset): void {
      console.log('toggling', pageNo, offset)
      storage.toggle(offset)
      request(toggle, { page: pageNo, offset })
        .then((result) => {
          console.log('toggled', pageNo, offset, result)
        })
        .catch((error) => {
          storage.toggle(offset) // revert
          console.error('error toggling', pageNo, offset, error)
        })
    },
  }
}

export function createDb(): Db {
  const pageCache = new LRUCache<PageNo, BitStorage>({ max: 128 })

  return {
    getPage(page: PageNo): BitStorage {
      console.log('getPage', page)
      const cached = pageCache.get(page)
      if (cached !== undefined) return cached

      console.log('not cached, requesting', page)
      const newPage = createPage(page)
      pageCache.set(page, newPage)
      return newPage
    },
  }
}
