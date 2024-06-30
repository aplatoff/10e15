//

import { type Method } from 'proto'

export interface Requestor {
  request: <P extends any[], R>(method: Method<P, R>, ...params: P) => Promise<R>
}
