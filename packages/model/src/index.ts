//

// const KB = 10
const MB = 20
const GB = 30
// const TB = 40
// const PB = 50

export type CheckboxNo = number & { __tag: 'checkbox' }
export type PageNo = number & { __tag: 'page' }
export type Checkbox = {
  page: PageNo
  offset: number
}

export const TotalCheckboxes = ((1 << GB) * (1 << MB)) as CheckboxNo // JS limit shifts to 32 bits
export const PageSizeBits = MB + 1 // 2 MB

export const checkboxesPerPage = 1 << (PageSizeBits + 3) // count bits, not bytes

// Bitwise operations in JS are complicated with anything larger than 32 bits
export const extractNo = (checkboxNo: CheckboxNo): Checkbox => ({
  page: ((checkboxNo / checkboxesPerPage) | 0) as PageNo,
  offset: checkboxNo & (checkboxesPerPage - 1),
})
