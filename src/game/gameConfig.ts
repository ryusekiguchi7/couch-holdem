import {
  BIG_BLIND,
  DEFAULT_PLAYER_COUNT,
  MAX_PLAYERS,
  SMALL_BLIND,
  STARTING_CHIPS,
} from './constants'
import type { GameConfig } from './types'

export type { GameConfig }

export const DEFAULT_GAME_CONFIG: GameConfig = {
  playerCount: DEFAULT_PLAYER_COUNT,
  startingChips: STARTING_CHIPS,
  smallBlind: SMALL_BLIND,
  bigBlind: BIG_BLIND,
}

export function normalizeGameConfig(config: Partial<GameConfig>): GameConfig {
  const playerCount = clamp(
    Math.floor(config.playerCount ?? DEFAULT_GAME_CONFIG.playerCount),
    2,
    MAX_PLAYERS,
  )
  const startingChips = Math.max(
    1,
    Math.floor(config.startingChips ?? DEFAULT_GAME_CONFIG.startingChips),
  )
  const smallBlind = Math.max(
    0.5,
    parseBlindAmount(config.smallBlind, DEFAULT_GAME_CONFIG.smallBlind),
  )
  const bigBlind = Math.max(
    smallBlind,
    parseBlindAmount(config.bigBlind, DEFAULT_GAME_CONFIG.bigBlind),
  )

  return { playerCount, startingChips, smallBlind, bigBlind }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function parseBlindAmount(value: number | undefined, fallback: number) {
  const parsed = Number(value ?? fallback)
  return Number.isFinite(parsed) ? parsed : fallback
}
