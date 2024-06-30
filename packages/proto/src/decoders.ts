//

import { type Checkbox, type PageNo } from 'model'

function toggleDecoder(buf: Buffer): [Checkbox] {
  const page = buf.readUInt32BE(0) as PageNo
  const offset = buf.readUInt32BE(4)
  return [{ page, offset }]
}
const subscribeDecoder = (buf: Buffer): [PageNo] => [buf.readUInt32BE() as PageNo]

export const decoders = [toggleDecoder, subscribeDecoder]
