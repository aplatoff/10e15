//

import { LRUCache } from 'lru-cache'
import { type CheckboxNo, extractNo, type PageNo, PageSizeBits } from 'model'
import { subscribe, toggle } from 'proto'
import { request } from './client'

const MaxCachedPages = 128

export interface Db {
  getPage(no: CheckboxNo): Page
}

export interface Page {
  getCheckbox(no: CheckboxNo): number
  toggleCheckbox(no: CheckboxNo): void
  contains(no: CheckboxNo): boolean
}

function createPage(pageNo: PageNo): Page {
  const data = new Uint8Array(1 << PageSizeBits)

  const page: Page = {
    getCheckbox(no: CheckboxNo): number {
      const checkbox = extractNo(no)
      if (checkbox.page !== pageNo)
        throw new Error(`Invalid checkbox number ${no} for page ${pageNo}`)
      return (data[checkbox.offset >> 3] >> (no & 7)) & 1
    },
    toggleCheckbox(no: CheckboxNo) {
      const checkbox = extractNo(no)
      if (checkbox.page !== pageNo)
        throw new Error(`Invalid checkbox number ${no} for page ${pageNo}`)
      data[checkbox.offset >> 3] ^= 1 << (no & 7)
      request(toggle, checkbox)
    },
    contains: (no: CheckboxNo): boolean => extractNo(no).page === pageNo,
  }

  request(subscribe, pageNo)
    .then((result) => {
      console.log('subscribed to', pageNo, result)
    })
    .catch((error) => {
      console.error('error subscribing to', pageNo, error)
    })

  return page
}

export function createDb(): Db {
  const pageCache = new LRUCache<PageNo, Page>({ max: MaxCachedPages })

  return {
    getPage(no: CheckboxNo): Page {
      console.log('getPage', no)

      const { page } = extractNo(no)
      console.log('pageNo', page)

      const cached = pageCache.get(page)
      if (cached !== undefined) return cached

      console.log('not cached, requesting', page)
      const newPage = createPage(page)
      pageCache.set(page, newPage)

      return newPage
    },
  }
}
