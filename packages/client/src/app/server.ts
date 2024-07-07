import { createClient, type ErrorCode, ErrorTag, parseHeader, ResultTag, toErrorCode } from 'proto'
import { type Server } from './types'

type Callbacks = [(value: any) => void, (error: ErrorCode) => void]

export function createServer(
  url: string,
  onUpdate: (updateId: number, payload: ArrayBuffer) => void
): Server {
  const requests = new Map<number, Callbacks>()

  const transport = createClient(url)
  transport.addListener((buffer: ArrayBuffer) => {
    const view = new DataView(buffer)
    const { tag, id } = parseHeader(view.getUint32(0))
    switch (tag) {
      case ErrorTag:
      case ResultTag:
        const callbacks = requests.get(id)
        if (callbacks) {
          const [resolve, reject] = callbacks
          requests.delete(id)
          if (tag === ErrorTag) reject({ code: 0, message: 'Unknown error' })
          else resolve(buffer.slice(4))
        } else console.error('No request found for response:', id)
        break
      default:
        onUpdate(tag, buffer.slice(1))
        // const request = decodeRequest(buffer)
        // if (request.method === toggle.code) {
        //   // TODO type handling
        //   const checkbox = request.params[0] as Checkbox
        //   db.toggle(checkbox)
        // }
        break
    }
  })

  let lastId = 0

  return {
    sendCommand: (command: [number, ArrayBuffer]): Promise<ArrayBuffer> => {
      const id = ++lastId
      const payload = command[1]
      const message = new Uint8Array(payload.byteLength + 4)
      message[0] = command[0]
      message[1] = id >>> 16
      message[2] = id >>> 8
      message[3] = id
      message.set(new Uint8Array(payload), 4)

      return new Promise((resolve, reject) => {
        requests.set(id, [resolve, reject])
        try {
          transport.postRequest(message.buffer)
        } catch (error) {
          reject(toErrorCode(error))
        }
      })
    },
  }
}
