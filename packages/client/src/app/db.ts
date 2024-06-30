//

import { LRUCache } from 'lru-cache'
import { type PageNo } from 'model'
import { createBitStorage, subscribe, type BitStorage } from 'proto'
import { type Requestor } from './types'

export interface Db {
  getPage(no: PageNo): BitStorage
}

export function createDb(requestor: Requestor): Db {
  const pageCache = new LRUCache<PageNo, BitStorage>({ max: 128 })

  function createPage(pageNo: PageNo): BitStorage {
    requestor
      .request(subscribe, pageNo)
      .then((result) => {
        console.log('subscribed to', pageNo, result)
      })
      .catch((error) => {
        console.error('error subscribing to', pageNo, error)
      })

    return createBitStorage()
  }

  return {
    getPage(page: PageNo): BitStorage {
      const cached = pageCache.get(page)
      if (cached !== undefined) return cached

      const newPage = createPage(page)
      pageCache.set(page, newPage)
      return newPage
    },
  }
}
