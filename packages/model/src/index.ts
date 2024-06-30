//

// const KB = 10
const MB = 20
const GB = 30
// const TB = 40
// const PB = 50

export type CheckboxNo = number & { __tag: 'checkbox' }
export type PageNo = number & { __tag: 'page' }

export const TotalCheckboxes = ((1 << GB) * (1 << MB)) as CheckboxNo // JS limit shifts to 32 bits
export const PageSizeBits = MB + 1 // 2 MB

export const checkboxesPerPage = 1 << (PageSizeBits + 3) // count bits, not bytes

export const checkboxToPage = (checkboxNo: CheckboxNo): [PageNo, number] => [
  ((checkboxNo / checkboxesPerPage) | 0) as PageNo,
  checkboxNo & (checkboxesPerPage - 1),
]

// console.log(checkboxToPage(0 as CheckboxNo))
// console.log(checkboxToPage(100000 as CheckboxNo))
// console.log(checkboxToPage(1000000 as CheckboxNo))
// console.log(checkboxToPage(10000000 as CheckboxNo))
// console.log(checkboxToPage(100000000 as CheckboxNo))
// console.log(checkboxToPage(1000000000 as CheckboxNo))
// console.log(checkboxToPage(10000000000 as CheckboxNo))
// console.log(checkboxToPage(100000000000 as CheckboxNo))
// console.log(checkboxToPage(1000000000000 as CheckboxNo))
// console.log(checkboxToPage(10000000000000 as CheckboxNo))
