//

import type { PageNo } from 'model'

type Config = {
  drives: number
  paths: string[]
  memory: number
}

const production = {
  drives: 16,
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

export interface Db {
  toggle(pageNo: PageNo, offset: number): void
}

export function createDb(config: Config): Db {
  return {

  }
}
