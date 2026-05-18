export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
export type Rank =
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | 'T'
  | 'J'
  | 'Q'
  | 'K'
  | 'A'

export interface Card {
  suit: Suit
  rank: Rank
  id: string
}

export type GamePhase = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown'

export type PlayerId = string

export interface HandResult {
  label: string
  score: number[]
}

export interface PotBreakdown {
  label: string
  amount: number
  formula: string
  eligibleNames: string[]
}

export interface PlayerState {
  id: PlayerId
  /** 0 = 下中央（自分）。時計回りに 1, 2, … */
  seatIndex: number
  name: string
  chips: number
  bet: number
  committed: number
  holeCards: Card[]
  isDealer: boolean
  blind?: 'small' | 'big'
  position?: 'UTG' | 'HJ' | 'CO'
  isActive: boolean
  hasFolded: boolean
  isHuman: boolean
  lastAction?: string
  actionAmount?: number
  handDelta?: number
}

export interface TableState {
  phase: GamePhase
  pot: number
  currentBet: number
  minRaise: number
  communityCards: Card[]
  players: PlayerState[]
  deck: Card[]
  dealerSeatIndex: number
  activeSeatIndex: number | null
  checkedSeatIndexes: number[]
  actionLog: string[]
  winnerIds: PlayerId[]
  winningHandLabel?: string
  message: string
}
