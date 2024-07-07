//

import { type CheckboxNo } from 'model'
import { createDb } from './db'
import { setupUI } from './ui'

// Db setup

const db = createDb('ws://localhost:3000/proto', () => ui.scheduleDraw())

// UI setup

const gotoInput = document.getElementById('goto') as HTMLInputElement
const smallerButton = document.getElementById('smaller') as HTMLButtonElement
const largerButton = document.getElementById('larger') as HTMLButtonElement

const wrapper = document.getElementById('canvas-wrapper') as HTMLDivElement
const canvas = document.getElementById('checkboxes') as HTMLCanvasElement

const time = document.getElementById('time') as HTMLElement

const ui = setupUI(db, wrapper, canvas, time, (firstCheckbox) => {
  gotoInput.value = firstCheckbox.toString()
})

gotoInput.addEventListener('input', (e: Event) => {
  const currentValue = (e.target as HTMLInputElement).value
  const value = currentValue === '' ? 0 : parseInt(currentValue, 10)
  if (isNaN(value) || value < 0) return
  ui.goto(BigInt(value) as CheckboxNo)
})

smallerButton.addEventListener('click', () => {
  smallerButton.disabled = ui.makeSmaller()
  largerButton.disabled = false
})

largerButton.addEventListener('click', () => {
  largerButton.disabled = ui.makeLarger()
  smallerButton.disabled = false
})
