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
