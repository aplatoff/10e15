//
import type { PageNo, Time } from 'model'
import { getPath } from './config'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function createServer(port: number) {
  const server = Bun.serve({
    fetch(req) {
      if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: cors })
      }
      const url = new URL(req.url)
      const pageId = url.pathname.slice(1)
      const pageCode = pageId.split('-')
      const page = Number(pageCode[0]) as PageNo
      const time = BigInt(pageCode[1]) as Time
      console.log(`serving page data ${page} with time ${time}`)
      const path = getPath(page)
      const file = Bun.file(path)
      console.log('serving', path, file.size, file.type)
      return new Response(file, {
        headers: {
          ...cors,
          'Cache-Control': 'public, max-age=31536000',
          ETag: `"${pageId}"`,
        },
      })
    },
    port,
  })
  return server
}

const server = createServer(8000)
console.log(`server running on port ${server.port}`)
