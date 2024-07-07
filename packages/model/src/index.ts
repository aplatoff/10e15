//

const KB = 1024n
const MB = KB * KB
const GB = KB * MB
const TB = KB * GB
const PB = KB * TB

export type Time = bigint & { __tag: 'time' }
export type CheckboxNo = bigint & { __tag: 'checkbox' }
export type PageNo = number & { __tag: 'page' }
export type Checkbox = {
  page: PageNo
  offset: number
}

export const TotalCheckboxes = 1n * PB

const PageSize = 512n * KB
const CheckboxesPerByte = 8n
export const CheckboxesPerPage = CheckboxesPerByte * PageSize
const LastCheckboxInPage = CheckboxesPerPage - 1n

// Bitwise operations in JS are complicated with anything larger than 32 bits
export const extractNo = (checkboxNo: CheckboxNo): Checkbox => ({
  page: Number(checkboxNo / CheckboxesPerPage) as PageNo,
  offset: Number(checkboxNo & LastCheckboxInPage),
})

export const MaxPageNo = extractNo(TotalCheckboxes as CheckboxNo).page

console.log('MaxPageNo', MaxPageNo.toString(16))
