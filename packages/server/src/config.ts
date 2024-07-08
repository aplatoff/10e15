//
import { type PageNo } from 'model'

export type Config = {
  drives: number
  paths: string[]
  memory: number
  maxTransientCache: number
  maxPersistentCache: number
}

const production: Config = {
  drives: 1,
  paths: [
    '/home/andrey',
    // '/mnt/disk0',
    // '/mnt/disk1',
    // '/mnt/disk2',
    // '/mnt/disk3',
    // '/mnt/disk4',
    // '/mnt/disk5',
    // '/mnt/disk6',
    // '/mnt/disk7',
    // '/mnt/disk8',
    // '/mnt/disk9',
    // '/mnt/diska',
    // '/mnt/diskb',
    // '/mnt/diskc',
    // '/mnt/diskd',
  ],
  memory: 64 * 1024, // MB
  maxTransientCache: 16 * 1024,
  maxPersistentCache: 1 << 20,
}

const dev: Config = {
  drives: 1,
  paths: ['/tmp'],
  memory: 1 * 1024, // MB
  maxTransientCache: 2,
  maxPersistentCache: 2,
}

export const config = process.env.NODE_ENV === 'production' ? production : dev

const rootDir = '10e15'
const name = (value: number, pad: number) => value.toString(16).padStart(pad, '0')

export const getDir = (pageNo: PageNo): string => {
  const drive = pageNo % config.drives
  const rest = (pageNo / config.drives) | 0
  const root = rest & 0xff
  const subfolder = (rest >>> 8) & 0xff
  return `${config.paths[drive]}/${rootDir}/${name(root, 2)}/${name(subfolder, 2)}`
}
export const getPath = (pageNo: PageNo): string => {
  const local = (pageNo / config.drives) | 0
  const file = local >>> 16
  return `${getDir(pageNo)}/${name(file, 3)}`
}
