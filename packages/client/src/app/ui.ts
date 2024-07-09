//

import { extractNo, LastCheckbox, TotalCheckboxes, type CheckboxNo, type Time } from 'model'
import { type Db } from './db'

const numberFormat = new Intl.NumberFormat(navigator.language)
const dpr = window.devicePixelRatio || 1

// const maxCellSize = 32
// const minCellSize = 4
// const minFontSize = 8

interface Presentation {
  draw(): void
  scroll(pixels: number): void
  alignScroll(): void
  getCheckbox(x: number, y: number): CheckboxNo | undefined
  toggle(no: CheckboxNo): void
}

export interface UI {
  changeCols(cols: number): void
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
  onRowChange?: (firstCheckbox: CheckboxNo, cols: number) => void
): UI {
  let cols = 100
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

  let line: CheckboxNo[] | undefined

  function mouseDraw(event: MouseEvent) {
    if (!presentation || !line) return
    const c = xy(event)
    const no = presentation.getCheckbox(c[0], c[1])
    if (no && line.indexOf(no) < 0) {
      line.push(no)
      presentation.toggle(no)
    }
  }

  function xy(event: MouseEvent): [number, number] {
    const rect = canvas.getBoundingClientRect()
    return [event.clientX - rect.left, event.clientY - rect.top]
  }

  function click(coord: [number, number]) {
    if (!presentation) return
    const checkbox = presentation?.getCheckbox(coord[0], coord[1])
    if (checkbox) presentation.toggle(checkbox)
  }

  canvas.addEventListener('mousedown', (event) => {
    click(xy(event))
    // line = []
    // mouseDraw(event)
  })
  canvas.addEventListener('mousemove', mouseDraw)
  canvas.addEventListener('mouseup', () => {
    line = undefined
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
    event.preventDefault()
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

  const colsResevedForRowNumber = 8

  function createPresentation(): Presentation {
    const bWidth = wrapper.clientWidth
    const bHeight = wrapper.clientHeight

    const width = bWidth * dpr
    const height = bHeight * dpr

    canvas.width = width
    canvas.height = height
    canvas.style.width = bWidth + 'px'
    canvas.style.height = bHeight + 'px'

    const ctx = canvas.getContext('2d')!

    let cellSize = width / (cols + 2)
    let leftOffset = 0

    const isSmallCell = cellSize < 12 * dpr
    if (isSmallCell) {
      cellSize |= 0
      leftOffset = colsResevedForRowNumber * 2 * cellSize
      const workArea = width - leftOffset
      cellSize = (workArea / (cols + 2)) | 0
    } else {
      leftOffset = colsResevedForRowNumber * cellSize
    }

    console.log('cellSize', cellSize, 'cols', cols)

    const fontSize = isSmallCell ? cellSize : cellSize / 2
    ctx.font = `${fontSize.toString()}px JetBrains Mono`
    ctx.textAlign = 'right'

    const nCols = BigInt(cols)
    const rows = Math.ceil(height / cellSize)

    let offsetPixels = 0 // vertical offset in pixels for smooth scrolling

    const checkboxFunction = isSmallCell ? smallCheckbox : bigCheckbox

    function eachRow(f: (firstCheckBoxInRow: CheckboxNo, row: number, absolute: bigint) => void) {
      const firstRow = Number(firstCheckbox / nCols)
      for (let r = firstRow === 0 ? 0 : -1; r < rows; r++) {
        const row = BigInt(firstRow + r)
        const rowStart = (row * nCols) as CheckboxNo
        if (rowStart >= TotalCheckboxes) break
        f(rowStart, r, row)
      }
    }

    function bigNumbers(ctx: CanvasRenderingContext2D) {
      ctx.fillStyle = 'black'
      eachRow((rowStart, r) => {
        ctx.fillText(
          numberFormat.format(rowStart),
          leftOffset - cellSize / 2,
          r * cellSize + (cellSize / 16) * 11
        )
      })
    }

    function smallNumbers(ctx: CanvasRenderingContext2D) {
      ctx.fillStyle = 'black'
      eachRow((rowStart, r, abs) => {
        if (abs % 2n === 0n) {
          const rowSize = cellSize * 2
          ctx.fillText(
            numberFormat.format(rowStart),
            leftOffset - rowSize / 2,
            (r / 2) * rowSize + (rowSize / 16) * 11
          )
        }
      })
    }

    const textFunction = isSmallCell ? smallNumbers : bigNumbers

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
        pixels *= dpr
        offsetPixels += pixels
        const sign = Math.sign(offsetPixels)
        const rowDelta = Math.floor(Math.abs(offsetPixels) / cellSize)
        if (rowDelta !== 0) {
          firstCheckbox = (firstCheckbox + BigInt(sign * rowDelta * cols)) as CheckboxNo
          if (firstCheckbox < 0) firstCheckbox = 0n as CheckboxNo
          onRowChange?.(firstCheckbox, cols)
        }
        offsetPixels = sign * (Math.abs(offsetPixels) % cellSize)
        if (firstCheckbox === 0n && offsetPixels <= 0) {
          offsetPixels = 0
        }
      },

      alignScroll() {
        offsetPixels = 0
      },

      getCheckbox(x: number, y: number): CheckboxNo | undefined {
        console.log('getCheckbox', x, y)
        x *= dpr
        y *= dpr
        const cx = ((x - leftOffset) / cellSize) | 0
        const cy = ((y + offsetPixels) / cellSize) | 0

        if (cx < cols && cx >= 0) {
          const firstRow = firstCheckbox / nCols
          const no = ((firstRow + BigInt(cy)) * nCols + BigInt(cx)) as CheckboxNo
          console.log('no', no)
          return no
        }
      },
      toggle(no: CheckboxNo) {
        console.log('toggle', no)
        db.toggle(extractNo(no))
      },
    }
  }

  function changeCols(newCols: number) {
    console.log('changeCols', newCols)
    cols = newCols
    updatePresentation()
    onRowChange?.(firstCheckbox, cols)
    return cols
  }

  return {
    changeCols,
    makeLarger: () => changeCols((cols / 1.1) | 0) < 35,
    makeSmaller: () => changeCols((cols * 1.1) | 0) > 300,

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
  const width = cellSize / 2
  const x14 = x + cellSize / 4
  const y14 = y + cellSize / 4
  const x12 = x + cellSize / 2
  const y12 = y + cellSize / 2
  const x34 = x + (cellSize * 3) / 4
  const y34 = y + (cellSize * 3) / 4

  if (checked) {
    ctx.fillStyle = '#f60'
    ctx.fillRect(x14, y14, width, width)
  }

  ctx.fillStyle = '#f60'
  ctx.strokeStyle = 'black'
  const lineWidth = cellSize / 20
  ctx.lineWidth = lineWidth

  ctx.beginPath()
  ctx.roundRect(x14, y14, width, width, [lineWidth])
  ctx.stroke()

  if (checked) {
    const lineWidth = cellSize / 15
    const offsetX = lineWidth * 1.5
    const offsetY = lineWidth * 2
    ctx.lineWidth = lineWidth
    ctx.lineJoin = 'round'

    ctx.beginPath()
    ctx.moveTo(x14 + offsetX, y12)
    ctx.lineTo(x12, y34 - offsetY)
    ctx.lineTo(x34 - offsetX, y14 + offsetY)
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
  const width = (cellSize * 1) / 2
  const x18 = x + cellSize / 4
  const y18 = y + cellSize / 4

  ctx.lineWidth = cellSize / 20
  if (checked) {
    ctx.fillStyle = '#f60'
    ctx.strokeStyle = 'black'
  } else {
    ctx.fillStyle = '#f8f8f8'
    ctx.strokeStyle = '#ccc'
  }

  ctx.fillRect(x18, y18, width, width)
  ctx.strokeRect(x18, y18, width, width)
}
