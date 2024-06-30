//

import { PageSizeBits, type CheckboxNo, type PageNo } from 'model'

function toggleDecoder(buf: Buffer): [CheckboxNo] {
  const pageNo = buf.readUInt32BE(0) as PageNo
  const checkbox = buf.readUInt32BE(4) as CheckboxNo
  return [((pageNo << (PageSizeBits + 3)) | checkbox) as CheckboxNo]
}
const subscribeDecoder = (buf: Buffer): [PageNo] => [buf.readUInt32BE() as PageNo]

export const decoders = [toggleDecoder, subscribeDecoder]
