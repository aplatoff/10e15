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
export const CheckboxesPerPageBits = MB + 2 // 4 million checkboxes per page
export const CheckboxesPerPage = 1 << CheckboxesPerPageBits

// Bitwise operations in JS are complicated with anything larger than 32 bits
export const extractNo = (checkboxNo: CheckboxNo): Checkbox => ({
  page: ((checkboxNo / CheckboxesPerPage) | 0) as PageNo,
  offset: checkboxNo & (CheckboxesPerPage - 1),
})

export const MaxPageNo = extractNo(TotalCheckboxes).page

console.log('MaxPageNo', MaxPageNo.toString(16))
