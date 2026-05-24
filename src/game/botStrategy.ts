import { evaluateBestHand } from './gameEngine'
import type { Card, PlayerState, Rank, TableState } from './types'

const RANK_VALUE: Record<Rank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  T: 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
}

export type BotDecision =
  | { action: 'check' }
  | { action: 'call' }
  | { action: 'fold' }
  | { action: 'betOrRaise'; targetBet: number }

/** 有効スタック ÷ 現在ポット（ベット込み） */
export function getStackToPotRatio(table: TableState, player: PlayerState): number {
  const pot = Math.max(1, totalPot(table))
  return getEffectiveStack(table, player) / pot
}

type SprAdjustments = {
  callMarginShift: number
  defendRateShift: number
  valueRaiseBonus: number
  semiBluffPenalty: number
  openThresholdShift: number
  betSizeMultiplier: number
  allInEquityShift: number
  commitShoveRate: number
}

/** 0 = 早期, 1 = BTN/CO 寄り */
export function decideBotAction(
  table: TableState,
  player: PlayerState,
): BotDecision {
  const toCall = amountToCall(table, player)
  const equity = estimateBotEquity(table, player)
  const position = getPositionFactor(player, table)
  const opponents = countActiveOpponents(table, player)
  const multiwayPenalty = Math.max(0, opponents - 1) * 0.04
  const spr = getStackToPotRatio(table, player)
  const sprAdjust = getSprAdjustments(spr)

  if (toCall > 0) {
    if (table.phase === 'preflop') {
      return decidePreflopFacingBet(
        table,
        player,
        equity,
        position,
        multiwayPenalty,
      )
    }

    return decideFacingBet(
      table,
      player,
      equity,
      position,
      multiwayPenalty,
      spr,
      sprAdjust,
    )
  }

  if (table.phase === 'preflop') {
    return decidePreflopWhenCheckedTo(
      table,
      player,
      equity,
      position,
      multiwayPenalty,
    )
  }

  return decideWhenCheckedTo(
    table,
    player,
    equity,
    position,
    multiwayPenalty,
    sprAdjust,
  )
}

type PreflopHandProfile = {
  high: number
  low: number
  suited: boolean
  pair: boolean
  gap: number
  isSuitedConnector: boolean
  isSuitedAce: boolean
  isWheelSuitedAce: boolean
  isSmallPair: boolean
  isBroadway: boolean
}

function classifyPreflopHand(cards: Card[]): PreflopHandProfile | null {
  if (cards.length < 2) return null

  const [first, second] = cards
  const high = Math.max(RANK_VALUE[first.rank], RANK_VALUE[second.rank])
  const low = Math.min(RANK_VALUE[first.rank], RANK_VALUE[second.rank])
  const suited = first.suit === second.suit
  const pair = first.rank === second.rank
  const gap = high - low

  return {
    high,
    low,
    suited,
    pair,
    gap,
    isSuitedConnector: suited && gap <= 1 && low >= 4 && high <= 11,
    isSuitedAce: suited && high === 14 && low <= 9,
    isWheelSuitedAce: suited && high === 14 && low >= 2 && low <= 5,
    isSmallPair: pair && high <= 6,
    isBroadway: high >= 10 && low >= 10,
  }
}

function isPolarPreflop3Bet(profile: PreflopHandProfile) {
  if (!profile.suited) return false
  if (profile.isWheelSuitedAce) return true
  if (profile.isSuitedConnector && profile.low >= 5) return true
  return false
}

function isPreflopFlatCallCandidate(
  profile: PreflopHandProfile,
  equity: number,
) {
  if (profile.isSmallPair || profile.isSuitedConnector) return true
  if (profile.isSuitedAce && profile.low >= 5) return true
  if (profile.suited && profile.high >= 10) return true
  if (profile.isBroadway && equity >= 0.4) return true
  if (profile.pair && profile.high <= 9) return true
  return equity >= 0.48
}

function getPolar3BetFrequency(
  profile: PreflopHandProfile,
  isBigBlind: boolean,
  position: number,
  multiwayPenalty: number,
) {
  let frequency = isBigBlind ? 0.11 : 0.04 + position * 0.05
  if (profile.isWheelSuitedAce && profile.low === 5) frequency += 0.025
  if (profile.isSuitedConnector) frequency += 0.015
  return clamp(frequency - multiwayPenalty, 0.04, 0.16)
}

function shouldPreflopDefendCall(
  equity: number,
  potOdds: number,
  profile: PreflopHandProfile | null,
  isBigBlind: boolean,
  position: number,
  multiwayPenalty: number,
) {
  const margin = isBigBlind ? -0.05 : 0.03 + (1 - position) * 0.04
  if (equity >= potOdds + margin + 0.07) return true

  if (!profile) {
    return (
      equity >= potOdds + margin &&
      random() < (isBigBlind ? 0.28 : 0.12)
    )
  }

  if (!isPreflopFlatCallCandidate(profile, equity)) {
    return (
      equity >= potOdds + margin &&
      random() < (isBigBlind ? 0.2 : 0.08)
    )
  }

  let frequency = isBigBlind ? 0.64 : 0.22 + position * 0.28
  if (profile.isSuitedConnector) frequency += 0.1
  if (profile.isWheelSuitedAce) frequency += 0.05
  if (profile.isSmallPair) frequency += 0.06
  frequency += clamp(equity - potOdds, -0.12, 0.18) * 1.1
  frequency -= multiwayPenalty

  return random() < clamp(frequency, 0.2, 0.9)
}

/** プリフロップ facing bet: バリュー3bet / 低頻度ポーラー3bet / ディフェンドコール / フォールド */
function decidePreflopFacingBet(
  table: TableState,
  player: PlayerState,
  equity: number,
  position: number,
  multiwayPenalty: number,
): BotDecision {
  const toCall = amountToCall(table, player)
  const potOdds = toCall / Math.max(1, totalPot(table) + toCall)
  const canRaise = player.chips > toCall + table.minRaise
  const facingRaise = table.currentBet > table.config.bigBlind
  const openThreshold = getPreflopOpenThreshold(position, multiwayPenalty)
  const profile = classifyPreflopHand(player.holeCards)
  const isBigBlind = player.blind === 'big'
  const sizing = getSprAdjustments(8)

  if (toCall >= player.chips) {
    return equity >= potOdds + 0.06 - position * 0.03
      ? { action: 'call' }
      : { action: 'fold' }
  }

  if (!canRaise) {
    return equity >= potOdds + 0.08 ? { action: 'call' } : { action: 'fold' }
  }

  if (facingRaise) {
    if (equity >= openThreshold + 0.1) {
      return {
        action: 'betOrRaise',
        targetBet: raiseTarget(table, player, 'value', sizing),
      }
    }

    if (profile && isPolarPreflop3Bet(profile)) {
      const polarFrequency = getPolar3BetFrequency(
        profile,
        isBigBlind,
        position,
        multiwayPenalty,
      )
      if (random() < polarFrequency) {
        return {
          action: 'betOrRaise',
          targetBet: raiseTarget(table, player, 'semi', sizing),
        }
      }
    }

    if (
      shouldPreflopDefendCall(
        equity,
        potOdds,
        profile,
        isBigBlind,
        position,
        multiwayPenalty,
      )
    ) {
      return { action: 'call' }
    }

    return { action: 'fold' }
  }

  if (shouldPreflopOpen(equity, openThreshold, position)) {
    return {
      action: 'betOrRaise',
      targetBet: raiseTarget(
        table,
        player,
        equity > 0.78 ? 'value' : 'semi',
        sizing,
      ),
    }
  }

  return { action: 'fold' }
}

function decidePreflopWhenCheckedTo(
  table: TableState,
  player: PlayerState,
  equity: number,
  position: number,
  multiwayPenalty: number,
): BotDecision {
  const minBet = table.config.bigBlind
  if (player.chips < minBet) {
    return { action: 'check' }
  }

  const isoThreshold =
    getPreflopOpenThreshold(position, multiwayPenalty) + 0.03
  const sizing = getSprAdjustments(8)

  if (equity < isoThreshold) {
    const bluffRate = getPreflopBluffRate(position, multiwayPenalty)
    if (random() < bluffRate) {
      return {
        action: 'betOrRaise',
        targetBet: betTarget(table, player, 'bluff', sizing),
      }
    }
    return { action: 'check' }
  }

  if (shouldPreflopOpen(equity, isoThreshold, position)) {
    return {
      action: 'betOrRaise',
      targetBet: betTarget(
        table,
        player,
        equity > 0.72 ? 'value' : 'protection',
        sizing,
      ),
    }
  }

  return { action: 'check' }
}

function decideFacingBet(
  table: TableState,
  player: PlayerState,
  equity: number,
  position: number,
  multiwayPenalty: number,
  spr: number,
  sprAdjust: SprAdjustments,
): BotDecision {
  const toCall = amountToCall(table, player)
  const potOdds = toCall / Math.max(1, totalPot(table) + toCall)
  const canRaise = player.chips > toCall + table.minRaise
  const facingLargeBet = toCall / Math.max(1, player.chips) > 0.35
  const margin =
    0.04 + multiwayPenalty + (1 - position) * 0.07 + sprAdjust.callMarginShift

  if (toCall >= player.chips) {
    const required =
      potOdds + 0.08 - position * 0.04 + sprAdjust.allInEquityShift
    return equity >= required ? { action: 'call' } : { action: 'fold' }
  }

  if (
    canRaise &&
    table.phase !== 'preflop' &&
    spr <= 4 &&
    equity >= 0.58 &&
    random() < sprAdjust.commitShoveRate
  ) {
    return {
      action: 'betOrRaise',
      targetBet: player.bet + player.chips,
    }
  }

  if (canRaise) {
    const valueRaiseChance =
      0.38 - multiwayPenalty + sprAdjust.valueRaiseBonus
    if (equity > 0.8 && random() < valueRaiseChance) {
      return {
        action: 'betOrRaise',
        targetBet: raiseTarget(table, player, 'value', sprAdjust),
      }
    }

    const semiBluff = equity >= 0.28 && equity <= 0.52 && hasStrongDraw(table, player)
    const semiBluffChance =
      0.07 + position * 0.05 - multiwayPenalty - sprAdjust.semiBluffPenalty
    if (semiBluff && random() < semiBluffChance) {
      return {
        action: 'betOrRaise',
        targetBet: raiseTarget(table, player, 'semi', sprAdjust),
      }
    }
  }

  const requiredEquity = potOdds + margin
  if (equity >= requiredEquity) {
    return { action: 'call' }
  }

  const defendRate = clamp(
    minimumDefendFrequency(potOdds, equity, position, facingLargeBet) +
      sprAdjust.defendRateShift,
    0.12,
    0.88,
  )
  if (equity >= potOdds - 0.04 && random() < defendRate) {
    return { action: 'call' }
  }

  return { action: 'fold' }
}

function decideWhenCheckedTo(
  table: TableState,
  player: PlayerState,
  equity: number,
  position: number,
  multiwayPenalty: number,
  sprAdjust: SprAdjustments,
): BotDecision {
  const minBet = table.config.bigBlind
  if (player.chips < minBet) {
    return { action: 'check' }
  }

  const openThreshold =
    getOpenThreshold(table, position, multiwayPenalty) + sprAdjust.openThresholdShift

  if (equity < openThreshold) {
    const bluffRate =
      getBluffRate(table, position) - multiwayPenalty - sprAdjust.semiBluffPenalty
    if (random() < bluffRate) {
      return {
        action: 'betOrRaise',
        targetBet: betTarget(table, player, 'bluff', sprAdjust),
      }
    }
    return { action: 'check' }
  }

  const betRate =
    getValueBetRate(table, equity, position) -
    multiwayPenalty +
    sprAdjust.valueRaiseBonus * 0.5
  if (random() < betRate) {
    return {
      action: 'betOrRaise',
      targetBet: betTarget(
        table,
        player,
        equity > 0.72 ? 'value' : 'protection',
        sprAdjust,
      ),
    }
  }

  return { action: 'check' }
}

function estimateBotEquity(table: TableState, player: PlayerState): number {
  if (table.phase === 'preflop') {
    return estimatePreflopEquity(player.holeCards)
  }

  const cards = [...player.holeCards, ...table.communityCards]
  const made = evaluateBestHand(cards).score[0] / 8
  const draw = estimateDrawEquity(cards)
  const highCard =
    Math.max(...player.holeCards.map((card) => RANK_VALUE[card.rank])) / 14

  return clamp(made * 0.68 + draw * 0.22 + highCard * 0.1, 0, 1)
}

function estimatePreflopEquity(cards: Card[]): number {
  if (cards.length < 2) return 0

  const [first, second] = cards
  const high = Math.max(RANK_VALUE[first.rank], RANK_VALUE[second.rank])
  const low = Math.min(RANK_VALUE[first.rank], RANK_VALUE[second.rank])
  const pair = first.rank === second.rank
  const suited = first.suit === second.suit
  const gap = high - low
  const connected = gap <= 1
  const oneGap = gap === 2

  let score = (high * 1.3 + low) / 44
  if (pair) {
    score = 0.5 + high / 28
  } else {
    if (suited) score += 0.05
    if (connected) score += 0.04
    if (oneGap && suited) score += 0.02
    if (high >= 14 && low >= 10) score += 0.06
    if (high >= 13 && low >= 10 && suited) score += 0.04
    if (!suited && gap >= 3 && high < 12) score -= 0.07
    if (!suited && gap >= 2 && low < 9) score -= 0.05
  }

  return clamp(score, 0, 1)
}

function estimateDrawEquity(cards: Card[]): number {
  if (cards.length < 4) return 0

  const bySuit = groupBySuit(cards)
  const flushCount = Math.max(...Object.values(bySuit).map((group) => group.length))
  const flushDraw = flushCount === 4 ? 0.18 : flushCount >= 5 ? 0.35 : 0

  const values = [...new Set(cards.map((card) => RANK_VALUE[card.rank]))].sort(
    (a, b) => b - a,
  )
  const normalized = values.includes(14) ? [...values, 1] : values

  let straightDraw = 0
  for (let high = 14; high >= 5; high -= 1) {
    const run = [high, high - 1, high - 2, high - 3]
    const hits = run.filter((value) => normalized.includes(value)).length
    if (hits === 4) straightDraw = Math.max(straightDraw, 0.16)
    if (hits === 3 && (normalized.includes(high + 1) || normalized.includes(high - 4))) {
      straightDraw = Math.max(straightDraw, 0.12)
    }
  }

  return clamp(flushDraw + straightDraw, 0, 0.45)
}

function hasStrongDraw(table: TableState, player: PlayerState): boolean {
  return (
    estimateDrawEquity([...player.holeCards, ...table.communityCards]) >= 0.14
  )
}

function getPositionFactor(player: PlayerState, table: TableState): number {
  const count = table.players.length
  const offset =
    (player.seatIndex - table.dealerSeatIndex + count) % count

  if (count <= 2) return 0.85
  if (offset === 0) return 1
  if (offset === count - 1 || offset === count - 2) return 0.82
  if (offset === count - 3) return 0.62
  return 0.38
}

/** 6-max 想定のオープン閾値（高いほどタイト） */
function getPreflopOpenThreshold(position: number, multiwayPenalty: number) {
  let threshold: number
  if (position >= 0.9) threshold = 0.46
  else if (position >= 0.75) threshold = 0.5
  else if (position >= 0.55) threshold = 0.53
  else threshold = 0.57

  return clamp(threshold + multiwayPenalty, 0.44, 0.6)
}

function shouldPreflopOpen(
  equity: number,
  threshold: number,
  position: number,
) {
  if (equity >= threshold + 0.09) return true
  if (equity < threshold) return false

  const margin = equity - threshold
  const frequency = clamp(0.08 + position * 0.55 + margin * 1.6, 0.08, 0.88)
  return random() < frequency
}

function getPreflopBluffRate(position: number, multiwayPenalty: number) {
  return clamp(0.015 + position * 0.02 - multiwayPenalty, 0.005, 0.05)
}

function getOpenThreshold(
  table: TableState,
  position: number,
  multiwayPenalty: number,
): number {
  if (table.phase === 'preflop') {
    return getPreflopOpenThreshold(position, multiwayPenalty)
  }

  if (table.phase === 'flop') {
    return clamp(0.46 - position * 0.14 + multiwayPenalty, 0.22, 0.52)
  }

  return clamp(0.4 - position * 0.1 + multiwayPenalty, 0.2, 0.48)
}

function getValueBetRate(
  table: TableState,
  equity: number,
  position: number,
): number {
  const streetFactor =
    table.phase === 'preflop' ? 0.88 : table.phase === 'flop' ? 0.62 : 0.48
  return clamp(streetFactor * (0.35 + equity * 0.55) + position * 0.08, 0.12, 0.9)
}

function getBluffRate(table: TableState, position: number): number {
  if (table.phase === 'river') return 0.04 + position * 0.05
  if (table.phase === 'turn') return 0.05 + position * 0.04
  if (table.phase === 'flop') return 0.07 + position * 0.05
  return 0.06 + position * 0.07
}

function minimumDefendFrequency(
  potOdds: number,
  equity: number,
  position: number,
  facingLargeBet: boolean,
): number {
  const mdf = 1 - potOdds
  const adjusted = mdf * 0.85 + equity * 0.2 + position * 0.1
  return clamp(adjusted - (facingLargeBet ? 0.08 : 0), 0.18, 0.82)
}

function getSprAdjustments(spr: number): SprAdjustments {
  if (spr <= 2) {
    return {
      callMarginShift: -0.09,
      defendRateShift: 0.14,
      valueRaiseBonus: 0.18,
      semiBluffPenalty: 0.03,
      openThresholdShift: -0.08,
      betSizeMultiplier: 1.4,
      allInEquityShift: -0.07,
      commitShoveRate: 0.42,
    }
  }

  if (spr <= 4) {
    return {
      callMarginShift: -0.06,
      defendRateShift: 0.1,
      valueRaiseBonus: 0.12,
      semiBluffPenalty: 0.01,
      openThresholdShift: -0.05,
      betSizeMultiplier: 1.22,
      allInEquityShift: -0.05,
      commitShoveRate: 0.28,
    }
  }

  if (spr <= 8) {
    return {
      callMarginShift: -0.02,
      defendRateShift: 0.04,
      valueRaiseBonus: 0.04,
      semiBluffPenalty: 0,
      openThresholdShift: -0.02,
      betSizeMultiplier: 1.05,
      allInEquityShift: -0.02,
      commitShoveRate: 0.12,
    }
  }

  if (spr <= 13) {
    return {
      callMarginShift: 0.02,
      defendRateShift: -0.04,
      valueRaiseBonus: -0.04,
      semiBluffPenalty: 0.02,
      openThresholdShift: 0.03,
      betSizeMultiplier: 0.88,
      allInEquityShift: 0.03,
      commitShoveRate: 0.04,
    }
  }

  return {
    callMarginShift: 0.06,
    defendRateShift: -0.1,
    valueRaiseBonus: -0.1,
    semiBluffPenalty: 0.05,
    openThresholdShift: 0.08,
    betSizeMultiplier: 0.72,
    allInEquityShift: 0.06,
    commitShoveRate: 0.02,
  }
}

function betTarget(
  table: TableState,
  player: PlayerState,
  profile: 'value' | 'protection' | 'bluff',
  sprAdjust: SprAdjustments,
): number {
  const pot = Math.max(totalPot(table), table.config.bigBlind)
  const bb = table.config.bigBlind

  if (table.phase === 'preflop' && table.currentBet === 0) {
    const openSize = Math.round(2.2 * bb)
    return Math.min(player.bet + player.chips, player.bet + openSize)
  }

  if (table.phase === 'preflop') {
    const raiseSize = Math.max(
      table.currentBet + table.minRaise,
      Math.round(table.currentBet * 2.8),
    )
    return Math.min(player.bet + player.chips, raiseSize)
  }

  const potFraction =
    profile === 'value' ? 0.72 : profile === 'protection' ? 0.45 : 0.33
  const target = Math.max(
    table.currentBet + table.minRaise,
    Math.round(pot * potFraction * sprAdjust.betSizeMultiplier),
  )
  return Math.min(player.bet + player.chips, Math.max(bb, target))
}

function raiseTarget(
  table: TableState,
  player: PlayerState,
  profile: 'value' | 'semi',
  sprAdjust: SprAdjustments,
): number {
  const multiplier =
    (profile === 'value' ? 2.75 : 2.35) * clamp(sprAdjust.betSizeMultiplier, 0.85, 1.35)
  const target = Math.max(
    table.currentBet + table.minRaise,
    Math.round(table.currentBet * multiplier),
  )
  return Math.min(player.bet + player.chips, target)
}

function totalPot(table: TableState) {
  return table.pot + table.players.reduce((sum, player) => sum + player.bet, 0)
}

function getEffectiveStack(table: TableState, player: PlayerState) {
  const activeStacks = table.players
    .filter((candidate) => !candidate.hasFolded)
    .map((candidate) => candidate.chips)

  if (activeStacks.length === 0) return player.chips
  return Math.min(player.chips, ...activeStacks)
}

function countActiveOpponents(table: TableState, player: PlayerState) {
  return table.players.filter(
    (candidate) => !candidate.hasFolded && candidate.id !== player.id,
  ).length
}

function amountToCall(table: TableState, player: PlayerState) {
  return Math.max(0, table.currentBet - player.bet)
}

function groupBySuit(cards: Card[]) {
  return cards.reduce<Record<string, Card[]>>(
    (groups, card) => {
      groups[card.suit].push(card)
      return groups
    },
    { hearts: [], diamonds: [], clubs: [], spades: [] },
  )
}

function random() {
  return Math.random()
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
