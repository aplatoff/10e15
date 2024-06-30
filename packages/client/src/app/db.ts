//

import { LRUCache } from 'lru-cache'
import { type CheckboxNo, type PageNo, PageSizeBits } from 'model'
import { subscribe } from 'proto'
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

const split = (value: number, bits: number): [number, number] => [
  value >>> bits,
  value & ((1 << bits) - 1),
]

function createPage(pageNo: PageNo): Page {
  const data = new Uint8Array(1 << PageSizeBits)

  const page: Page = {
    getCheckbox(no: CheckboxNo): number {
      const [verify, offset] = split(no, PageSizeBits + 3)
      if (verify !== pageNo) throw new Error(`Invalid checkbox number ${no} for page ${pageNo}`)
      return (data[offset >> 3] >> (no & 7)) & 1
    },
    toggleCheckbox(no: CheckboxNo) {
      const [verify, offset] = split(no, PageSizeBits + 3)
      if (verify !== pageNo) throw new Error(`Invalid checkbox number ${no} for page ${pageNo}`)
      data[offset >> 3] ^= 1 << (no & 7)
    },
    contains(no: CheckboxNo): boolean {
      return no >> (PageSizeBits + 3) === pageNo
    },
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
      const pageNo = (no >>> (PageSizeBits + 3)) as PageNo

      const page = pageCache.get(pageNo)
      if (page !== undefined) return page

      const newPage = createPage(pageNo)
      pageCache.set(pageNo, newPage)

      return newPage
    },
  }
}
