//

import { Protocol, RpcException, type RpcRequest, type RpcResponse } from 'proto'
import { type Client } from './types'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker
      .register('worker.bundle.js')
      .then((registration) => {
        console.log('Service Worker registration successful with scope:', registration.scope)
      })
      .catch((err) => {
        console.log('Service Worker registration failed:', err)
      })
  })
}

export const createTransport = (): Client => ({
  postRequest(req: RpcRequest) {
    if (navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage(req)
    else throw new RpcException(1, 'Service worker not available')
  },
  addResponseListener(listener: (res: RpcResponse) => void) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('Received message from service worker:', event.data)
      const response = event.data as RpcResponse
      if (response.protocol === Protocol) listener(response)
    })
  },
})
