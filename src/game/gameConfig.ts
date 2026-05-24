import { buildBlindStructure } from './blindStructure'
import {
  BIG_BLIND,
  DEFAULT_PLAYER_COUNT,
  DEFAULT_STACK_BB,
  MAX_PLAYERS,
  SMALL_BLIND,
  STACK_BB_OPTIONS,
  STARTING_CHIPS,
  type StackBbOption,
} from './constants'
import type { GameConfig } from './types'

export type { GameConfig, StackBbOption }

export const DEFAULT_GAME_CONFIG: GameConfig = {
  playerCount: DEFAULT_PLAYER_COUNT,
  startingChips: STARTING_CHIPS,
  smallBlind: SMALL_BLIND,
  bigBlind: BIG_BLIND,
  blindStructure: buildBlindStructure(SMALL_BLIND, BIG_BLIND),
}

export function startingChipsFromStackBb(stackBb: number) {
  return stackBb * BIG_BLIND
}

export function normalizeStackBb(value: number | undefined): StackBbOption {
  const parsed = Math.floor(value ?? DEFAULT_STACK_BB)
  return STACK_BB_OPTIONS.includes(parsed as StackBbOption)
    ? (parsed as StackBbOption)
    : DEFAULT_STACK_BB
}

export function normalizeGameConfig(config: Partial<GameConfig>): GameConfig {
  const playerCount = clamp(
    Math.floor(config.playerCount ?? DEFAULT_GAME_CONFIG.playerCount),
    2,
    MAX_PLAYERS,
  )
  const startingChips = Math.max(
    BIG_BLIND,
    Math.floor(config.startingChips ?? DEFAULT_GAME_CONFIG.startingChips),
  )
  const smallBlind = SMALL_BLIND
  const bigBlind = BIG_BLIND
  const blindStructure = buildBlindStructure(smallBlind, bigBlind)

  return {
    playerCount,
    startingChips,
    smallBlind,
    bigBlind,
    blindStructure,
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
