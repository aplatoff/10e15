//

import { type CheckboxNo, type Time } from 'model'
import { createDb } from './db'
import { setupUI } from './ui'

// Db setup

const db = createDb((time?: Time) => ui.scheduleDraw(time))

// UI setup

const gotoInput = document.getElementById('goto') as HTMLInputElement
const c50 = document.getElementById('c50') as HTMLButtonElement
const c100 = document.getElementById('c100') as HTMLButtonElement
const c200 = document.getElementById('c200') as HTMLButtonElement
const smallerButton = document.getElementById('smaller') as HTMLButtonElement
const largerButton = document.getElementById('larger') as HTMLButtonElement

const wrapper = document.getElementById('canvas-wrapper') as HTMLDivElement
const canvas = document.getElementById('checkboxes') as HTMLCanvasElement

const time = document.getElementById('time') as HTMLElement

const ui = setupUI(db, wrapper, canvas, time, (firstCheckbox, cols) => {
  const str = firstCheckbox.toString()
  gotoInput.value = str
  window.location.hash = `${str}-${cols}`
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
  const presentation = href.split('#')[1]
  if (presentation) {
    const [hash, colsStr] = presentation.split('-')
    gotoInput.value = hash
    ui.goto(BigInt(hash) as CheckboxNo)
    const cols = parseInt(colsStr, 10)
    ui.changeCols(cols > 30 && cols < 400 ? cols : 100)
  }
}

window.onload = () => {
  ui.updatePresentation()
  hashChange()
}
window.addEventListener('hashchange', hashChange)

function changeCols(n: number) {
  ui.changeCols(n)
  smallerButton.disabled = false
  largerButton.disabled = false
}

c50.addEventListener('click', () => changeCols(50))
c100.addEventListener('click', () => changeCols(100))
c200.addEventListener('click', () => changeCols(200))

smallerButton.addEventListener('click', () => {
  smallerButton.disabled = ui.makeSmaller()
  largerButton.disabled = false
})

largerButton.addEventListener('click', () => {
  largerButton.disabled = ui.makeLarger()
  smallerButton.disabled = false
})
