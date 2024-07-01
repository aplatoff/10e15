//

import { LRUCache } from 'lru-cache'
import { type PageNo } from 'model'
import { createPage, subscribe, type BitStorage } from 'proto'
import { type Requestor } from './types'

export interface Db {
  getPage(no: PageNo): BitStorage
}

export function createDb(requestor: Requestor): Db {
  const pageCache = new LRUCache<PageNo, BitStorage>({ max: 128 })

  return {
    getPage(page: PageNo): BitStorage {
      const cached = pageCache.get(page)
      if (cached !== undefined) return cached

      const newPage = createPage()
      pageCache.set(page, newPage)
      requestor
        .request(subscribe, page)
        .then((result) => {
          console.log('subscribed to', page, result)
        })
        .catch((error) => {
          console.error('error subscribing to', page, error)
        })

      return newPage
    },
  }
}
