import { MAX_PLAYERS } from './constants'

export interface SeatPosition {
  gridColumn: string
  gridRow: string
  justifySelf: string
  alignSelf: string
}

/**
 * seat 0（自分）を下中央に置き、最大6人を3x3グリッド上に配置。
 * 中央テーブルは背景扱いにして、席同士の重なりを避ける。
 * @param count 2〜MAX_PLAYERS
 */
export function getSeatPositions(count: number): SeatPosition[] {
  const n = Math.min(MAX_PLAYERS, Math.max(2, Math.floor(count)))

  if (n === 2) {
    return [seat('2', '3', 'center', 'end'), seat('2', '1', 'center', 'start')]
  }

  if (n === 3) {
    return [
      seat('2', '3', 'center', 'end'),
      seat('1', '1', 'start', 'start'),
      seat('3', '1', 'end', 'start'),
    ]
  }

  if (n === 4) {
    return [
      seat('3', '3', 'end', 'end'),
      seat('1', '3', 'start', 'end'),
      seat('1', '1', 'start', 'start'),
      seat('3', '1', 'end', 'start'),
    ]
  }

  if (n === 5) {
    return [
      seat('2', '3', 'center', 'end'),
      seat('1', '3', 'start', 'end'),
      seat('1', '1', 'start', 'start'),
      seat('2', '1', 'center', 'start'),
      seat('3', '1', 'end', 'start'),
    ]
  }

  return [
    seat('2', '3', 'center', 'end'),
    seat('1', '3', 'start', 'end'),
    seat('1', '1', 'start', 'start'),
    seat('2', '1', 'center', 'start'),
    seat('3', '1', 'end', 'start'),
    seat('3', '3', 'end', 'end'),
  ]
}

function seat(
  gridColumn: string,
  gridRow: string,
  justifySelf: string,
  alignSelf: string,
): SeatPosition {
  return { gridColumn, gridRow, justifySelf, alignSelf }
}
