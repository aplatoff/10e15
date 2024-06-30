//

import { extractNo, TotalCheckboxes, type CheckboxNo, type PageNo } from 'model'
import { toggle, type BitStorage } from 'proto'
import { type Db } from './db'
import { type Requestor } from './types'

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
  goto(no: number): void
  scheduleDraw(): void
}

export function setupUI(
  db: Db,
  requestor: Requestor,
  wrapper: HTMLElement,
  canvas: HTMLCanvasElement,
  onRowChange?: (firstCheckbox: number) => void
): UI {
  let cellSize = maxCellSize
  let firstCheckbox = 0
  let presentation: Presentation | null = null
  let animationFrameId: number | undefined

  function scheduleDraw() {
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

  updatePresentation()
  canvas.style.display = 'block'

  canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    presentation?.click(x, y)
    scheduleDraw()
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
    const rows = Math.ceil(height / cellSize)

    let offsetPixels = 0 // vertical offset in pixels for smooth scrolling

    let pageNo = 0 as PageNo
    let page = db.getPage(pageNo)

    function getPage(no: PageNo): BitStorage {
      if (no !== pageNo) {
        pageNo = no
        page = db.getPage(no)
      }
      return page
    }

    const checkboxFunction = cellSize <= 8 ? smallCheckbox : bigCheckbox

    function eachRow(f: (firstCheckBoxInRow: number, row: number) => void) {
      const firstRow = Math.floor(firstCheckbox / cols)
      for (let r = firstRow === 0 ? 0 : -1; r < rows; r++) {
        const row = firstRow + r
        const rowStart = row * cols
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
      const firstRow = Math.floor(firstCheckbox / cols)
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
          for (let c = 0; c < cols; c++) {
            const checkboxNo = (rowStart + c) as CheckboxNo
            if (checkboxNo >= TotalCheckboxes) break

            const checkbox = extractNo(checkboxNo)
            const page = getPage(checkbox.page)
            checkboxFunction(
              ctx,
              leftOffset + c * cellSize,
              r * cellSize,
              cellSize,
              page.get(checkbox.offset) !== 0
            )
          }
        })

        ctx.restore()
      },

      scroll(pixels: number) {
        offsetPixels += pixels
        const sign = Math.sign(offsetPixels)
        const rowDelta = Math.floor(Math.abs(offsetPixels) / cellSize)
        if (rowDelta !== 0) {
          firstCheckbox += sign * rowDelta * cols
          if (firstCheckbox < 0) firstCheckbox = 0
          onRowChange?.(firstCheckbox)
        }
        offsetPixels = sign * (Math.abs(offsetPixels) % cellSize)
        if (firstCheckbox === 0 && offsetPixels <= 0) {
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
          const firstRow = Math.floor(firstCheckbox / cols)
          const no = ((firstRow + cy) * cols + cx) as CheckboxNo
          const checkbox = extractNo(no)
          const page = getPage(checkbox.page)
          page.toggle(checkbox.offset)

          requestor
            .request(toggle, { page: pageNo, offset: checkbox.offset })
            .then((result) => {
              console.log('toggled', pageNo, checkbox.offset, result)
            })
            .catch((error) => {
              page.toggle(checkbox.offset) // revert
              // TODO: redraw
              console.error('error toggling', pageNo, checkbox.offset, error)
            })
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

    goto(no: number) {
      firstCheckbox = no >= TotalCheckboxes ? TotalCheckboxes - 1 : no
      presentation?.alignScroll()
      scheduleDraw()
    },
    scheduleDraw,
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
