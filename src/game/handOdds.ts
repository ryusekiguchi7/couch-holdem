import { evaluateBestHand } from './gameEngine'
import type { Card, Rank, Suit } from './types'

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']

/** evaluateBestHand の label と一致させる */
export const HAND_RANK_NAMES = [
  'Royal Flush',
  'Straight Flush',
  'Four of a Kind',
  'Full House',
  'Flush',
  'Straight',
  'Three of a Kind',
  'Two Pair',
  'One Pair',
  'High Card',
] as const

export type HandRankName = (typeof HAND_RANK_NAMES)[number]

const DEFAULT_ITERATIONS = 1500

export type HandRankCompletionOdds = Record<HandRankName, number>

/** 0 = 最強（Royal Flush）、数が大きいほど弱い */
export function getHandRankTier(name: HandRankName): number {
  return HAND_RANK_NAMES.indexOf(name)
}

/**
 * HANDS 一覧用の表示％。ハイカード非表示・現在の役は100%・それより弱い役は非表示。
 */
export function getHandCompletionDisplayPercent(
  handName: HandRankName,
  currentHandLabel: HandRankName | undefined,
  odds: HandRankCompletionOdds | undefined,
): number | null {
  if (handName === 'High Card') return null
  if (!currentHandLabel || !odds) return null

  const handTier = getHandRankTier(handName)
  const currentTier = getHandRankTier(currentHandLabel)

  if (handTier > currentTier) return null
  if (handTier === currentTier) return 100
  return odds[handName]
}

/**
 * リバー時点でその役になる確率（%）をモンテカルロで推定。
 * 未配のコミュニティがある間だけシミュレーションし、リバー済みは確定値。
 */
export function getHandRankCompletionOdds(
  holeCards: Card[],
  communityCards: Card[],
  iterations = DEFAULT_ITERATIONS,
): HandRankCompletionOdds | undefined {
  if (holeCards.length < 2) return undefined

  const knownCards = [...holeCards, ...communityCards]
  const cardsToCome = Math.max(0, 5 - communityCards.length)

  if (cardsToCome === 0) {
    const finalLabel = evaluateBestHand(knownCards).label as HandRankName
    return HAND_RANK_NAMES.reduce((acc, name) => {
      acc[name] = name === finalLabel ? 100 : 0
      return acc
    }, {} as HandRankCompletionOdds)
  }

  const counts = new Map<HandRankName, number>()
  for (const name of HAND_RANK_NAMES) {
    counts.set(name, 0)
  }

  for (let i = 0; i < iterations; i += 1) {
    const label = simulateHeroRunoutLabel(holeCards, communityCards, knownCards)
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }

  return HAND_RANK_NAMES.reduce((acc, name) => {
    acc[name] = Math.round(((counts.get(name) ?? 0) / iterations) * 100)
    return acc
  }, {} as HandRankCompletionOdds)
}

function simulateHeroRunoutLabel(
  holeCards: Card[],
  communityCards: Card[],
  knownCards: Card[],
): HandRankName {
  const deck = shuffleDeck(createDeckExcluding(knownCards))
  const runoutCommunity = [...communityCards]
  let index = 0

  while (runoutCommunity.length < 5) {
    runoutCommunity.push(deck[index])
    index += 1
  }

  return evaluateBestHand([...holeCards, ...runoutCommunity]).label as HandRankName
}

function createDeckExcluding(knownCards: Card[]): Card[] {
  const knownIds = new Set(knownCards.map((card) => card.id))
  return SUITS.flatMap((suit) =>
    RANKS.map((rank) => ({
      suit,
      rank,
      id: `${rank}-${suit}`,
    })),
  ).filter((card) => !knownIds.has(card.id))
}

function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}
