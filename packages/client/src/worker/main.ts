//

/// <reference lib="WebWorker" />

// import { Request } from 'model'
// import { Methods } from './proto'

// const worker = self as unknown as ServiceWorkerGlobalScope

// worker.addEventListener('message', (event) => {
//   console.log('Received message in service worker:', event.data)
//   if ('method' in event.data) {
//     const request = event.data as Request
//     const method = (Methods as any)[request.method]
//     if (method) method(...request.params)
//     else console.error('Unknown method:', request.method)
//   }
//   // event.source!.postMessage('Acknowledged message: ' + event.data)
// })

// worker.addEventListener('install', (event) => {
//   console.log('Service Worker installing.')
// })

// worker.addEventListener('activate', (event) => {
//   console.log('Service Worker activated.') // Clean up old caches
// })

// worker.addEventListener('fetch', (event) => {
//   console.log('Fetching:', event.request.url)
// })
