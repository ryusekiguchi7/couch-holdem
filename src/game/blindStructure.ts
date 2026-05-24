import type { BlindLevel, BlindStructure, GameConfig, TableState } from './types'

export const BLIND_ADVANCE_EVERY_HANDS = 10
const MAX_BLIND_LEVELS = 12

export function buildBlindStructure(
  smallBlind: number,
  bigBlind: number,
): BlindStructure {
  const levels: BlindLevel[] = []
  let sb = smallBlind
  let bb = bigBlind

  for (let i = 0; i < MAX_BLIND_LEVELS; i += 1) {
    levels.push({ smallBlind: sb, bigBlind: bb })
    sb = bb
    bb = bb * 2
  }

  return {
    levels,
    advanceEveryHands: BLIND_ADVANCE_EVERY_HANDS,
  }
}

export function applyBlindLevelToConfig(
  config: GameConfig,
  levelIndex: number,
): GameConfig {
  const level = config.blindStructure.levels[
    Math.min(levelIndex, config.blindStructure.levels.length - 1)
  ]

  return {
    ...config,
    smallBlind: level.smallBlind,
    bigBlind: level.bigBlind,
  }
}

export interface BlindAdvanceResult {
  config: GameConfig
  blindLevelIndex: number
  handsInCurrentLevel: number
  levelUpMessage?: string
}

export function advanceBlindStructureAfterHand(
  table: TableState,
): BlindAdvanceResult {
  const handsInCurrentLevel = table.handsInCurrentLevel + 1
  const { blindStructure } = table.config
  const isMaxLevel =
    table.blindLevelIndex >= blindStructure.levels.length - 1

  if (
    handsInCurrentLevel < blindStructure.advanceEveryHands ||
    isMaxLevel
  ) {
    return {
      config: table.config,
      blindLevelIndex: table.blindLevelIndex,
      handsInCurrentLevel,
    }
  }

  const blindLevelIndex = table.blindLevelIndex + 1
  const config = applyBlindLevelToConfig(table.config, blindLevelIndex)
  const level = config.blindStructure.levels[blindLevelIndex]

  return {
    config,
    blindLevelIndex,
    handsInCurrentLevel: 0,
    levelUpMessage: `Level ${blindLevelIndex + 1} — Blinds ${level.smallBlind}/${level.bigBlind}`,
  }
}

export function getHandsUntilNextBlindLevel(table: TableState): number | null {
  const { blindStructure } = table.config
  if (table.blindLevelIndex >= blindStructure.levels.length - 1) {
    return null
  }

  return Math.max(0, blindStructure.advanceEveryHands - table.handsInCurrentLevel)
}

export function formatBlindLevelLabel(table: TableState): string {
  const level = table.blindLevelIndex + 1
  const { smallBlind, bigBlind } = table.config
  return `Lv${level} ${smallBlind}/${bigBlind}`
}
