//

export interface Server {
  sendCommand(command: [number, ArrayBufferLike]): Promise<ArrayBuffer>
}
