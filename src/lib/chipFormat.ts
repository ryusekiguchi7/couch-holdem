export function chipsToBb(chips: number, bigBlind: number) {
  return chips / Math.max(1, bigBlind)
}

export function bbToChips(bb: number, bigBlind: number) {
  return bb * Math.max(1, bigBlind)
}

export function formatBbValue(bbAmount: number) {
  return Number.isInteger(bbAmount) ? String(bbAmount) : bbAmount.toFixed(1)
}

export function formatChipAmount(
  amount: number,
  bigBlind: number,
  showInBb: boolean,
) {
  if (!showInBb) {
    return amount.toLocaleString()
  }

  return `${formatBbValue(chipsToBb(amount, bigBlind))} BB`
}

export function formatChipAmountForInput(
  amount: number,
  bigBlind: number,
  showInBb: boolean,
) {
  if (!showInBb) {
    return String(amount)
  }

  return formatBbValue(chipsToBb(amount, bigBlind))
}

export function parseChipAmountInput(
  value: string,
  bigBlind: number,
  showInBb: boolean,
) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null

  return showInBb ? bbToChips(parsed, bigBlind) : parsed
}
