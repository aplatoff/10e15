//

import { Checkbox } from 'model'
import {
  createClient,
  type ErrorCode,
  type Method,
  protocol,
  type RpcError,
  type RpcRequest,
  type RpcResponse,
  type RpcResult,
  toErrorCode,
  toggle,
} from 'proto'
import { createDb } from './db'
import { decodeRequest } from './decode'
import { setupUI } from './ui'

type Callbacks = [(value: any) => void, (error: ErrorCode) => void]
const requests = new Map<number, Callbacks>()

const transport = createClient('ws://localhost:3000/proto', decodeRequest)

transport.addResponseListener((response: RpcResponse) => {
  console.log('Received reponse from service worker:', response)
  const callbacks = requests.get(response.id)
  if (callbacks) {
    const [resolve, reject] = callbacks
    requests.delete(response.id)
    if ('error' in response) {
      reject((response as RpcError).error)
      ui.scheduleDraw()
    } else resolve((response as RpcResult).result)
  } else console.error('No request found for response:', response)
})

transport.addBroadcastListener((request: RpcRequest) => {
  console.log('Received broadcast from service worker:', request)
  if (request.method === toggle.code) {
    // TODO type handling
    const checkbox = request.params[0] as Checkbox
    db.getPage(checkbox.page).toggle(checkbox.offset)
    ui.scheduleDraw()
  }
})

const postRequest = async <P extends any[], R>(req: RpcRequest<P, R>): Promise<R> =>
  new Promise((resolve, reject) => {
    if (req.id !== undefined) requests.set(req.id, [resolve, reject])
    try {
      transport.postRequest(req)
    } catch (error) {
      reject(toErrorCode(error))
    }
  })

let lastId = 0

const requestor = {
  request: <P extends any[], R>(method: Method<P, R>, ...params: P): Promise<R> =>
    postRequest({ protocol, id: ++lastId, method: method.code, params }),
}

// Db setup

const db = createDb(requestor)

// UI setup

const gotoInput = document.getElementById('goto') as HTMLInputElement
const smallerButton = document.getElementById('smaller') as HTMLButtonElement
const largerButton = document.getElementById('larger') as HTMLButtonElement

const wrapper = document.getElementById('canvas-wrapper') as HTMLDivElement
const canvas = document.getElementById('checkboxes') as HTMLCanvasElement

const ui = setupUI(db, requestor, wrapper, canvas, (firstCheckbox) => {
  gotoInput.value = firstCheckbox.toString()
})

gotoInput.addEventListener('input', (e: Event) => {
  const currentValue = (e.target as HTMLInputElement).value
  const value = currentValue === '' ? 0 : parseInt(currentValue, 10)
  if (isNaN(value) || value < 0) return
  ui.goto(value)
})

smallerButton.addEventListener('click', () => {
  smallerButton.disabled = ui.makeSmaller()
  largerButton.disabled = false
})

largerButton.addEventListener('click', () => {
  largerButton.disabled = ui.makeLarger()
  smallerButton.disabled = false
})
