import { createInitialTable } from './gameEngine'
import { normalizeGameConfig, type GameConfig } from './gameConfig'
import type { TableState } from './types'

export function createMockTable(config: Partial<GameConfig> = {}): TableState {
  return createInitialTable(normalizeGameConfig(config))
}
