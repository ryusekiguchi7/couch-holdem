import type { GamePhase, Suit } from './types'

export const PHASE_LABELS: Record<GamePhase, string> = {
  preflop: 'Preflop',
  flop: 'Flop',
  turn: 'Turn',
  river: 'River',
  showdown: 'Showdown',
}

export const SUIT_SYMBOL: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
}

/** ハート=赤 / スペード=黒 / クラブ=緑 / ダイヤ=青 */
export const SUIT_COLOR: Record<Suit, string> = {
  hearts: 'text-red-600',
  spades: 'text-neutral-900',
  clubs: 'text-green-600',
  diamonds: 'text-blue-600',
}

/**
 * トランプ表面の背景（スート別）
 * 色の値は src/index.css の --playing-card-face-* を編集
 */
export const CARD_FACE_BACKGROUND: Record<
  Suit,
  { bg: string; border: string }
> = {
  hearts: {
    bg: 'bg-playing-face-hearts',
    border: 'border-playing-face-border-hearts',
  },
  clubs: {
    bg: 'bg-playing-face-clubs',
    border: 'border-playing-face-border-clubs',
  },
  diamonds: {
    bg: 'bg-playing-face-diamonds',
    border: 'border-playing-face-border-diamonds',
  },
  spades: {
    bg: 'bg-playing-face-spades',
    border: 'border-playing-face-border-spades',
  },
}

/** 裏向き・スート不明時の表面 */
export const CARD_FACE_BACKGROUND_DEFAULT = {
  bg: 'bg-playing-face',
  border: 'border-playing-face-border',
} as const

/** トランプ裏面 */
export const CARD_BACKGROUND = {
  back: {
    bg: 'bg-gradient-to-br from-playing-back-from to-playing-back-to',
    border: 'border-gold/30',
    pattern: 'card-back-checker',
  },
} as const

export const MAX_PLAYERS = 6
/** 2〜6。レイアウト確認時は 6 に変更可 */
export const DEFAULT_PLAYER_COUNT = 6
export const STARTING_CHIPS = 50
export const SMALL_BLIND = 0.5
export const BIG_BLIND = 1
