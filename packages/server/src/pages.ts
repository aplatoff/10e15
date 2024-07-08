//
import type { PageNo, Time } from 'model'
import { getPath } from './config'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const prefix = '/pages/'
const prefixLength = prefix.length

function createServer(port: number) {
  const server = Bun.serve({
    fetch(req) {
      if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: cors })
      }
      try {
        const url = new URL(req.url)
        if (!url.pathname.startsWith(prefix)) return new Response('Not found', { status: 404 })
        const pageId = url.pathname.slice(prefixLength)
        const pageCode = pageId.split('-')
        const page = Number(pageCode[0]) as PageNo
        const time = BigInt(pageCode[1]) as Time
        const path = getPath(page)
        const file = Bun.file(path)
        console.log('serving', path, '@ time', time)
        return new Response(file, {
          headers: {
            ...cors,
            'Cache-Control': 'public, max-age=31536000',
            ETag: `"${pageId}"`,
          },
        })
      } catch (e) {
        console.error(e)
        return new Response('Not found', { status: 404 })
      }
    },
    port,
  })
  return server
}

const server = createServer(8000)
console.log(`server running on port ${server.port}`)
