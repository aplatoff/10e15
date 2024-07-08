//

import { extractNo, LastCheckbox, TotalCheckboxes, type CheckboxNo, type Time } from 'model'
import { type Db } from './db'

const numberFormat = new Intl.NumberFormat(navigator.language)
const dpr = window.devicePixelRatio || 1

const maxCellSize = 32
const minFontSize = 8

interface Presentation {
  draw(): void
  scroll(pixels: number): void
  alignScroll(): void
  click(x: number, y: number): void
}

export interface UI {
  makeLarger(): boolean
  makeSmaller(): boolean
  goto(no: CheckboxNo): void
  scheduleDraw(time?: Time): void
  updatePresentation(): void
}

export function setupUI(
  db: Db,
  wrapper: HTMLElement,
  canvas: HTMLCanvasElement,
  timeDiv: HTMLElement,
  onRowChange?: (firstCheckbox: CheckboxNo) => void
): UI {
  let cellSize = maxCellSize
  let firstCheckbox = 0n as CheckboxNo
  let lastKnownTime = 0n as Time
  let presentation: Presentation | null = null
  let animationFrameId: number | undefined

  function scheduleDraw(time?: Time) {
    if (time && time > lastKnownTime) lastKnownTime = time
    timeDiv.textContent = numberFormat.format(Number(lastKnownTime))
    if (animationFrameId === undefined) {
      animationFrameId = requestAnimationFrame(() => {
        presentation?.draw()
        animationFrameId = undefined
      })
    }
  }

  function updatePresentation() {
    presentation = createPresentation()
    scheduleDraw()
  }

  canvas.addEventListener('click', (event) => {
    event.preventDefault()
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    presentation?.click(x, y)
    return false
  })

  canvas.addEventListener(
    'wheel',
    (event: WheelEvent) => {
      event.preventDefault()
      presentation?.scroll(event.deltaY)
      scheduleDraw()
    },
    { passive: false }
  )

  // TOUCH EVENTS
  //

  // let lastTouchEnd = 0
  // let lastTouchDistance = 0
  let isDragging = false
  // let lastTouchX = 0
  let lastTouchY = 0

  canvas.addEventListener('touchstart', function (event) {
    if (event.touches.length === 1) {
      isDragging = true
      // lastTouchX = event.touches[0].clientX
      lastTouchY = event.touches[0].clientY
    } else if (event.touches.length === 2) {
      // lastTouchDistance = Math.hypot(
      //   event.touches[0].clientX - event.touches[1].clientX,
      //   event.touches[0].clientY - event.touches[1].clientY
      // )
    }
  })

  canvas.addEventListener('touchmove', function (event) {
    if (event.touches.length === 1 && isDragging) {
      // let deltaX = event.touches[0].clientX - lastTouchX
      let deltaY = lastTouchY - event.touches[0].clientY

      presentation?.scroll(deltaY)
      scheduleDraw()

      // lastTouchX = event.touches[0].clientX
      lastTouchY = event.touches[0].clientY
    } else if (event.touches.length === 2) {
      // let touchDistance = Math.hypot(
      //   event.touches[0].clientX - event.touches[1].clientX,
      //   event.touches[0].clientY - event.touches[1].clientY
      // )
      // let scale = touchDistance / lastTouchDistance
      // lastTouchDistance = touchDistance
    }
  })

  canvas.addEventListener('touchend', (event) => {
    if (event.touches.length === 0) {
      isDragging = false
    }
    // if (event.touches.length < 2) {
    //   lastTouchDistance = 0
    // }
  })

  canvas.addEventListener('touchcancel', () => {
    isDragging = false
    // lastTouchDistance = 0
  })

  ///

  window.addEventListener('resize', () => {
    updatePresentation()
  })

  function createPresentation(): Presentation {
    const width = wrapper.clientWidth
    const height = wrapper.clientHeight

    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = width + 'px'
    canvas.style.height = height + 'px'

    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)

    const fontSize = Math.max(8, cellSize >>> 1)
    ctx.font = `${fontSize.toString()}px JetBrains Mono`
    ctx.textAlign = 'right'

    const leftOffset = Math.max(16, cellSize) * 8
    const cols = Math.floor((width - leftOffset) / cellSize)
    const nCols = BigInt(cols)
    const rows = Math.ceil(height / cellSize)

    let offsetPixels = 0 // vertical offset in pixels for smooth scrolling

    const checkboxFunction = cellSize <= 8 ? smallCheckbox : bigCheckbox

    function eachRow(f: (firstCheckBoxInRow: CheckboxNo, row: number) => void) {
      const firstRow = Number(firstCheckbox / nCols)
      for (let r = firstRow === 0 ? 0 : -1; r < rows; r++) {
        const row = firstRow + r
        const rowStart = (BigInt(row) * nCols) as CheckboxNo
        if (rowStart >= TotalCheckboxes) break
        f(rowStart, r)
      }
    }

    function bigNumbers(ctx: CanvasRenderingContext2D) {
      ctx.fillStyle = 'black'
      eachRow((rowStart, r) => {
        ctx.fillText(
          numberFormat.format(rowStart),
          leftOffset - 16,
          r * cellSize + (cellSize / 16) * 11
        )
      })
    }

    function smallNumbers(ctx: CanvasRenderingContext2D) {
      ctx.fillStyle = 'black'
      const firstRow = Number(firstCheckbox / nCols)
      const textRows = Math.floor(height / minFontSize)
      const rowsPerText = minFontSize / cellSize
      for (let r = 0; r < textRows; r++) {
        const row = firstRow + r * rowsPerText
        const firstCheckbox = row * cols
        if (firstCheckbox >= TotalCheckboxes) break
        ctx.fillText(numberFormat.format(firstCheckbox), leftOffset - 16, r * 8 + 8)
      }
    }

    const textFunction = cellSize <= 8 ? smallNumbers : bigNumbers

    return {
      draw() {
        ctx.clearRect(0, 0, width, height)
        ctx.save()
        ctx.translate(0, -offsetPixels)

        textFunction(ctx)

        eachRow((rowStart, r) => {
          let checkboxNo = rowStart
          for (let c = 0; c < cols; c++) {
            if (checkboxNo >= TotalCheckboxes) break

            const checkbox = extractNo(checkboxNo)
            checkboxFunction(
              ctx,
              leftOffset + c * cellSize,
              r * cellSize,
              cellSize,
              db.getCheckbox(checkbox) !== 0
            )
            checkboxNo++
          }
        })

        ctx.restore()
      },

      scroll(pixels: number) {
        offsetPixels += pixels
        const sign = Math.sign(offsetPixels)
        const rowDelta = Math.floor(Math.abs(offsetPixels) / cellSize)
        if (rowDelta !== 0) {
          firstCheckbox = (firstCheckbox + BigInt(sign * rowDelta * cols)) as CheckboxNo
          if (firstCheckbox < 0) firstCheckbox = 0n as CheckboxNo
          onRowChange?.(firstCheckbox)
        }
        offsetPixels = sign * (Math.abs(offsetPixels) % cellSize)
        if (firstCheckbox === 0n && offsetPixels <= 0) {
          offsetPixels = 0
        }
      },

      alignScroll() {
        offsetPixels = 0
      },

      click(x: number, y: number) {
        const cx = Math.floor((x - leftOffset) / cellSize)
        const cy = Math.floor((y + offsetPixels) / cellSize)

        if (cx < cols && cx >= 0) {
          const firstRow = firstCheckbox / nCols
          const no = ((firstRow + BigInt(cy)) * nCols + BigInt(cx)) as CheckboxNo
          const checkbox = extractNo(no)
          db.toggle(checkbox)
        }
      },
    }
  }

  return {
    makeLarger() {
      cellSize <<= 1
      updatePresentation()
      return cellSize === maxCellSize
    },

    makeSmaller() {
      cellSize >>= 1
      updatePresentation()
      return cellSize === 4
    },

    goto(no: CheckboxNo) {
      firstCheckbox = no >= TotalCheckboxes ? LastCheckbox : no
      presentation?.alignScroll()
      scheduleDraw()
    },
    scheduleDraw,
    updatePresentation,
  }
}

function bigCheckbox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cellSize: number,
  checked: boolean
) {
  const s12 = cellSize / 2
  const s14 = cellSize / 4
  const s34 = s12 + s14

  if (checked) {
    ctx.fillStyle = '#f60'
    ctx.fillRect(x + s14, y + s14, s12, s12)
  }

  const lineWidth = cellSize / 10
  ctx.strokeStyle = 'black'
  ctx.lineWidth = lineWidth / 2

  ctx.beginPath()
  ctx.roundRect(x + s14, y + s14, s12, s12, [lineWidth])
  ctx.stroke()

  if (checked) {
    ctx.lineWidth = lineWidth
    ctx.lineJoin = 'round'

    ctx.beginPath()
    ctx.moveTo(x + s14 + lineWidth, y + s12)
    ctx.lineTo(x + s12, y + s34 - lineWidth)
    ctx.lineTo(x + s34 - lineWidth, y + s14 + lineWidth)
    ctx.stroke()
  }
}

function smallCheckbox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cellSize: number,
  checked: boolean
) {
  const s12 = cellSize / 2
  const s14 = cellSize / 4

  ctx.lineWidth = cellSize / 8

  if (checked) {
    ctx.fillStyle = 'black'
    ctx.strokeStyle = 'black'
    ctx.fillRect(x + s14, y + s14, s12, s12)
    ctx.strokeRect(x + s14, y + s14, s12, s12)
  } else {
    ctx.strokeStyle = '#ccc'
    ctx.strokeRect(x + s14, y + s14, s12, s12)
  }
}
