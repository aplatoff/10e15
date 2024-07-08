//

import { type CheckboxNo, type Time } from 'model'
import { createDb } from './db'
import { setupUI } from './ui'

// Db setup

const db = createDb((time?: Time) => ui.scheduleDraw(time))

// UI setup

const gotoInput = document.getElementById('goto') as HTMLInputElement
const smallerButton = document.getElementById('smaller') as HTMLButtonElement
const largerButton = document.getElementById('larger') as HTMLButtonElement

const wrapper = document.getElementById('canvas-wrapper') as HTMLDivElement
const canvas = document.getElementById('checkboxes') as HTMLCanvasElement

const time = document.getElementById('time') as HTMLElement

const ui = setupUI(db, wrapper, canvas, time, (firstCheckbox) => {
  const str = firstCheckbox.toString()
  gotoInput.value = str
  window.location.hash = str
})

gotoInput.addEventListener('input', (e: Event) => {
  const currentValue = (e.target as HTMLInputElement).value
  const value = currentValue === '' ? 0 : parseInt(currentValue, 10)
  if (isNaN(value) || value < 0) return
  ui.goto(BigInt(value) as CheckboxNo)
  window.location.hash = currentValue
})

document.addEventListener('keypress', (event) => {
  if (event.target === gotoInput) return
  event.preventDefault()
  const inputEvent = new Event('input', { bubbles: true, cancelable: true })
  gotoInput.value += event.key
  gotoInput.focus()
  gotoInput.dispatchEvent(inputEvent)
})

function hashChange() {
  const href = window.location.href
  const hash = href.split('#')[1]
  if (hash) {
    gotoInput.value = hash
    ui.goto(BigInt(hash) as CheckboxNo)
  }
}

window.onload = () => {
  ui.updatePresentation()
  hashChange()
}
window.addEventListener('hashchange', hashChange)

smallerButton.addEventListener('click', () => {
  smallerButton.disabled = ui.makeSmaller()
  largerButton.disabled = false
})

largerButton.addEventListener('click', () => {
  largerButton.disabled = ui.makeLarger()
  smallerButton.disabled = false
})
