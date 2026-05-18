import { DEFAULT_PLAYER_COUNT } from './constants'
import { createInitialTable } from './gameEngine'
import type { TableState } from './types'

/**
 * @param playerCount 2〜MAX_PLAYERS（省略時 DEFAULT_PLAYER_COUNT）
 */
export function createMockTable(
  playerCount: number = DEFAULT_PLAYER_COUNT,
): TableState {
  return createInitialTable(playerCount)
}
