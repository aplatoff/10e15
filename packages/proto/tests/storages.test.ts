import { createPage } from '../src/storages'

import { expect, test } from 'bun:test'

test('page test', () => {
  const page = createPage()
  page.toggle(5)
  expect(page.get(1)).toBe(0)
  expect(page.get(5)).toBe(1)
  page.toggle(1)
  expect(page.get(1)).toBe(1)
  page.toggle(5)
  expect(page.get(5)).toBe(0)
})

test('page load', () => {
  const page = createPage()
  page.toggle(5)
  let chunk: ArrayBufferLike
  page.save((data: ArrayBufferLike) => {
    chunk = data
  })
  expect(chunk!.byteLength).toBe(6)
  expect(page.get(5)).toBe(1)
  page.toggle(5)
  expect(page.get(5)).toBe(0)
  page.loadChunk(chunk!, 0)
  expect(page.get(5)).toBe(1)
  expect(page.get(7)).toBe(0)
  page.toggle(7)
  expect(page.get(7)).toBe(1)
})
