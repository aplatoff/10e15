//

export interface Server {
  sendCommand(commandId: number, payload: ArrayBufferLike): Promise<ArrayBuffer>
}
