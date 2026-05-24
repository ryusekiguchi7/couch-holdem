import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, Spade, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  formatBlindLevelLabel,
  getHandsUntilNextBlindLevel,
} from '@/game/blindStructure'
import { normalizeGameConfig, type GameConfig } from '@/game/gameConfig'
import {
  actCurrentBot,
  advanceSkippedActions,
  betOrRaiseCurrentPlayer,
  checkCurrentPlayer,
  foldCurrentPlayer,
  getPlayerHandLabel,
  startNextHand,
} from '@/game/gameEngine'
import {
  getHandCompletionDisplayPercent,
  getHandRankCompletionOdds,
  type HandRankCompletionOdds,
  type HandRankName,
} from '@/game/handOdds'
import { cn } from '@/lib/utils'
import { createMockTable } from '@/game/mockTable'
import { getSeatPositions } from '@/game/seatLayout'
import type { Card, Rank, Suit, TableState } from '@/game/types'

import { ActionBar } from './ActionBar'
import { CommunityCards } from './CommunityCards'
import { PlayerSeat } from './PlayerSeat'
import { PlayingCard } from './PlayingCard'
import { PotDisplay } from './PotDisplay'
import { SessionVictory } from './SessionVictory'

interface PokerTableProps {
  gameConfig: GameConfig
  onExit?: () => void
}

export function PokerTable({ gameConfig, onExit }: PokerTableProps) {
  const [table, setTable] = useState<TableState>(() =>
    createMockTable(normalizeGameConfig(gameConfig)),
  )
  const [isHandGuideOpen, setIsHandGuideOpen] = useState(false)
  const [queuedFold, setQueuedFold] = useState(false)
  const [showStackInBb, setShowStackInBb] = useState(false)
  const lastNotifiedTurnRef = useRef<string | null>(null)
  const hasPlayedWinSoundRef = useRef(false)

  const seatPositions = useMemo(
    () => getSeatPositions(table.players.length),
    [table.players.length],
  )

  const humanPlayer = useMemo(
    () => table.players.find((p) => p.isHuman),
    [table.players],
  )
  const activePlayer = useMemo(
    () => table.players.find((p) => p.seatIndex === table.activeSeatIndex),
    [table.activeSeatIndex, table.players],
  )
  const isShowdown = table.phase === 'showdown'
  const sessionWinner = useMemo(() => {
    const playersWithChips = table.players.filter((player) => player.chips > 0)
    return playersWithChips.length === 1 ? playersWithChips[0] : null
  }, [table.players])
  const isSessionVictory = isShowdown && sessionWinner !== null
  const humanToCall = Math.max(
    0,
    table.currentBet - (humanPlayer?.bet ?? 0),
  )
  const isHumanTurn = Boolean(
    humanPlayer?.isActive && !humanPlayer.hasFolded && (humanPlayer.chips ?? 0) > 0,
  )
  const canQueueFold = Boolean(
    humanPlayer &&
      !humanPlayer.hasFolded &&
      !isShowdown &&
      !humanPlayer.isActive &&
      humanPlayer.chips > 0 &&
      !queuedFold,
  )
  const canCancelQueuedFold = Boolean(
    humanPlayer &&
      !humanPlayer.hasFolded &&
      !isShowdown &&
      !humanPlayer.isActive &&
      humanPlayer.chips > 0 &&
      queuedFold,
  )
  const humanHandLabel = useMemo(() => {
    if (!humanPlayer || isShowdown || humanPlayer.hasFolded) return undefined
    return getPlayerHandLabel(humanPlayer, table.communityCards)
  }, [humanPlayer, isShowdown, table.communityCards])

  const blindSubLabel = useMemo(() => {
    const remaining = getHandsUntilNextBlindLevel(table)
    if (remaining === null) return 'Final blind level'
    if (remaining === 0) return 'Level up next hand'
    return `Level up in ${remaining} hand${remaining === 1 ? '' : 's'}`
  }, [table])

  const handGuideOdds = useMemo(() => {
    if (!isHandGuideOpen || !humanPlayer || humanPlayer.hasFolded) return undefined
    return getHandRankCompletionOdds(
      humanPlayer.holeCards,
      table.communityCards,
    )
  }, [humanPlayer, isHandGuideOpen, table.communityCards])

  useEffect(() => {
    if (!activePlayer || activePlayer.isHuman || isShowdown) return

    const timeoutId = window.setTimeout(() => {
      setTable((current) => actCurrentBot(current))
    }, 500)

    return () => window.clearTimeout(timeoutId)
  }, [activePlayer, isShowdown])

  useEffect(() => {
    if (isShowdown || table.activeSeatIndex !== null) return

    const timeoutId = window.setTimeout(() => {
      setTable((current) => advanceSkippedActions(current))
    }, 500)

    return () => window.clearTimeout(timeoutId)
  }, [isShowdown, table.activeSeatIndex, table.phase])

  useEffect(() => {
    const turnKey =
      activePlayer?.isHuman && !isShowdown
        ? `${table.phase}-${table.activeSeatIndex}-${table.currentBet}-${activePlayer.bet}`
        : null

    if (!turnKey) {
      lastNotifiedTurnRef.current = null
      return
    }

    if (lastNotifiedTurnRef.current === turnKey) return

    lastNotifiedTurnRef.current = turnKey
    playTurnSound()
  }, [activePlayer, isShowdown, table.activeSeatIndex, table.currentBet, table.phase])

  useEffect(() => {
    if (!queuedFold || !isHumanTurn || isShowdown) return

    setQueuedFold(false)
    setTable((current) => foldCurrentPlayer(current))
  }, [queuedFold, isHumanTurn, isShowdown, table.activeSeatIndex, table.phase])

  useEffect(() => {
    if (isShowdown || humanPlayer?.hasFolded) {
      setQueuedFold(false)
    }
  }, [humanPlayer?.hasFolded, isShowdown])

  useEffect(() => {
    setQueuedFold(false)
  }, [humanPlayer?.holeCards[0]?.id, humanPlayer?.holeCards[1]?.id])

  useEffect(() => {
    if (!isShowdown) {
      hasPlayedWinSoundRef.current = false
      return
    }

    const humanWon = Boolean(
      humanPlayer &&
        (table.winnerIds.includes(humanPlayer.id) ||
          sessionWinner?.id === humanPlayer.id),
    )
    if (!humanWon || hasPlayedWinSoundRef.current) return

    hasPlayedWinSoundRef.current = true
    playWinSound()
  }, [humanPlayer, isShowdown, sessionWinner, table.winnerIds])

  function handleCheck() {
    setTable((current) => checkCurrentPlayer(current))
  }

  function handleFold() {
    if (isHumanTurn) {
      setQueuedFold(false)
      setTable((current) => foldCurrentPlayer(current))
      return
    }

    if (canCancelQueuedFold) {
      setQueuedFold(false)
      return
    }

    if (canQueueFold) {
      setQueuedFold(true)
    }
  }

  function handleBet(targetBet: number) {
    setTable((current) => betOrRaiseCurrentPlayer(current, targetBet))
  }

  function handleNextGame() {
    setTable((current) => startNextHand(current))
  }

  return (
    <motion.div
      className="flex h-dvh overflow-hidden flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <header className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Spade className="size-5 text-gold" aria-hidden />
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Couch Hold&apos;em
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 min-h-8 rounded-full border-red-500/30 bg-card/80 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-red-400 hover:bg-red-500/10 hover:text-red-300"
            onClick={onExit}
          >
            Exit
          </Button>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 sm:px-3">
        <div className="relative mx-auto grid w-full max-w-lg flex-1 place-items-center">
          {/* フェルト（楕円）は常に中央固定の背景扱い */}
          <div className="pointer-events-none absolute inset-0 z-0 grid place-items-center">
            <motion.section
              className="relative aspect-[7/4] w-[min(88vw,32rem)] max-w-[94%] rounded-[50%] border-4 border-gold/25 felt-gradient table-rim"
              layout
              aria-label="Poker table"
            >
              <div className="pointer-events-none absolute inset-[6%] rounded-[50%] border border-white/5" />
            </motion.section>
          </div>

          {/* ポット・コミュニティ */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex w-full max-w-[min(92vw,21rem)] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2">
            <PotDisplay
              pot={table.pot}
              phase={table.phase}
              label={isShowdown && !table.winningHandLabel ? 'Hand Over' : undefined}
              blindLabel={formatBlindLevelLabel(table)}
              blindSubLabel={blindSubLabel}
            />
            <CommunityCards cards={table.communityCards} />
          </div>

          {/* プレイヤーシート（2〜6） */}
          <div className="relative z-20 grid h-full min-h-[min(74svh,34rem)] w-full grid-cols-3 grid-rows-[auto_1fr_auto] gap-x-1 gap-y-2 py-1 sm:gap-x-2 sm:gap-y-3 sm:py-2">
            {table.players.map((player) => {
              const pos = seatPositions[player.seatIndex]
              if (!pos) return null

              return (
                <div
                  key={player.id}
                  className="min-w-0"
                  style={{
                    gridColumn: pos.gridColumn,
                    gridRow: pos.gridRow,
                    justifySelf: pos.justifySelf,
                    alignSelf: pos.alignSelf,
                  }}
                >
                  <PlayerSeat
                    player={player}
                    bigBlind={table.config.bigBlind}
                    showStackInBb={showStackInBb}
                    onStackDisplayToggle={() =>
                      setShowStackInBb((current) => !current)
                    }
                    handLabel={
                      player.isHuman ? humanHandLabel : undefined
                    }
                    showCards={
                      player.isHuman ||
                      (isShowdown && Boolean(table.winningHandLabel) && !player.hasFolded)
                    }
                    isWinner={
                      table.winnerIds.includes(player.id) ||
                      sessionWinner?.id === player.id
                    }
                  />
                </div>
              )
            })}
          </div>

          <AnimatePresence>
            {isSessionVictory && sessionWinner && (
              <SessionVictory winner={sessionWinner} onExit={onExit} />
            )}
          </AnimatePresence>
        </div>
      </main>

      {isShowdown && !isSessionVictory && (
        <div className="shrink-0 space-y-2 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center">
          <p className="text-sm font-semibold text-gold">{table.message}</p>
          <Button
            variant="casino"
            size="lg"
            className="w-full"
            onClick={handleNextGame}
          >
            Next Game
          </Button>
        </div>
      )}

      {!isShowdown && (
        <ActionBar
          disabled={!isHumanTurn}
          disableFold={
            isHumanTurn ? humanToCall === 0 : !canQueueFold && !canCancelQueuedFold
          }
          foldLabel={queuedFold ? 'Cancel fold' : 'Fold'}
          bigBlind={table.config.bigBlind}
          showAmountsInBb={showStackInBb}
          pot={table.pot}
          currentBet={table.currentBet}
          minRaise={table.minRaise}
          playerBet={humanPlayer?.bet ?? 0}
          playerChips={humanPlayer?.chips ?? 0}
          onFold={handleFold}
          onCheck={handleCheck}
          onBet={handleBet}
        />
      )}

      <HandGuideDrawer
        open={isHandGuideOpen}
        onToggle={() => setIsHandGuideOpen((current) => !current)}
        completionOdds={handGuideOdds}
        currentHandLabel={humanHandLabel as HandRankName | undefined}
      />
    </motion.div>
  )
}

const HAND_RANKINGS: {
  name: HandRankName
  cards: Card[]
  involvedCount: number
  description: string
}[] = [
  {
    name: 'Royal Flush',
    involvedCount: 5,
    cards: handCards('royal', [
      ['A', 'spades'],
      ['K', 'spades'],
      ['Q', 'spades'],
      ['J', 'spades'],
      ['T', 'spades'],
    ]),
    description: '同じスートのA〜T',
  },
  {
    name: 'Straight Flush',
    involvedCount: 5,
    cards: handCards('straight-flush', [
      ['9', 'diamonds'],
      ['8', 'diamonds'],
      ['7', 'diamonds'],
      ['6', 'diamonds'],
      ['5', 'diamonds'],
    ]),
    description: '同じスートで連番',
  },
  {
    name: 'Four of a Kind',
    involvedCount: 4,
    cards: handCards('four-kind', [
      ['A', 'spades'],
      ['A', 'hearts'],
      ['A', 'diamonds'],
      ['A', 'clubs'],
      ['7', 'spades'],
    ]),
    description: '同じ数字が4枚',
  },
  {
    name: 'Full House',
    involvedCount: 5,
    cards: handCards('full-house', [
      ['K', 'spades'],
      ['K', 'hearts'],
      ['K', 'clubs'],
      ['9', 'diamonds'],
      ['9', 'spades'],
    ]),
    description: 'スリーカード + ワンペア',
  },
  {
    name: 'Flush',
    involvedCount: 5,
    cards: handCards('flush', [
      ['A', 'clubs'],
      ['J', 'clubs'],
      ['8', 'clubs'],
      ['4', 'clubs'],
      ['2', 'clubs'],
    ]),
    description: '同じスートが5枚',
  },
  {
    name: 'Straight',
    involvedCount: 5,
    cards: handCards('straight', [
      ['T', 'spades'],
      ['9', 'hearts'],
      ['8', 'diamonds'],
      ['7', 'clubs'],
      ['6', 'spades'],
    ]),
    description: 'スート不問の連番',
  },
  {
    name: 'Three of a Kind',
    involvedCount: 3,
    cards: handCards('three-kind', [
      ['Q', 'spades'],
      ['Q', 'hearts'],
      ['Q', 'clubs'],
      ['8', 'diamonds'],
      ['3', 'spades'],
    ]),
    description: '同じ数字が3枚',
  },
  {
    name: 'Two Pair',
    involvedCount: 4,
    cards: handCards('two-pair', [
      ['J', 'spades'],
      ['J', 'hearts'],
      ['6', 'diamonds'],
      ['6', 'clubs'],
      ['A', 'spades'],
    ]),
    description: 'ペアが2組',
  },
  {
    name: 'One Pair',
    involvedCount: 2,
    cards: handCards('one-pair', [
      ['T', 'spades'],
      ['T', 'hearts'],
      ['A', 'diamonds'],
      ['7', 'clubs'],
      ['4', 'spades'],
    ]),
    description: 'ペアが1組',
  },
  {
    name: 'High Card',
    involvedCount: 1,
    cards: handCards('high-card', [
      ['A', 'spades'],
      ['Q', 'hearts'],
      ['9', 'diamonds'],
      ['6', 'clubs'],
      ['2', 'spades'],
    ]),
    description: '役なし。高いカードで比較',
  },
]

function handCards(handId: string, cards: [Rank, Suit][]): Card[] {
  return cards.map(([rank, suit], index) => ({
    rank,
    suit,
    id: `guide-${handId}-${index}-${rank}-${suit}`,
  }))
}

const HAND_GUIDE_TAB_WIDTH_PX = 40
const HAND_GUIDE_PANEL_CLASS = 'w-[min(92vw,22rem)] max-w-md'

function HandGuideDrawer({
  open,
  onToggle,
  completionOdds,
  currentHandLabel,
}: {
  open: boolean
  onToggle: () => void
  completionOdds?: HandRankCompletionOdds
  currentHandLabel?: HandRankName
}) {
  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.button
            type="button"
            className="fixed inset-0 z-40 cursor-default border-0 bg-black/45 p-0 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onToggle}
            aria-label="Close hand guide"
          />
        )}
      </AnimatePresence>

      <motion.div
        className="fixed right-0 top-0 z-50 flex h-dvh"
        initial={false}
        animate={{
          x: open ? 0 : `calc(100% - ${HAND_GUIDE_TAB_WIDTH_PX}px)`,
        }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls="hand-guide-panel"
          className={cn(
            'flex w-10 shrink-0 flex-col items-center justify-center gap-1.5',
            'rounded-l-xl border border-r-0 border-gold/35 bg-card/95 shadow-lg shadow-black/40',
            'text-gold transition-colors hover:bg-gold/10',
          )}
          style={{ width: HAND_GUIDE_TAB_WIDTH_PX }}
        >
          <ChevronLeft
            className={cn(
              'size-4 shrink-0 transition-transform',
              open && 'rotate-180',
            )}
            aria-hidden
          />
          <span
            className="text-[10px] font-bold uppercase tracking-[0.22em]"
            style={{ writingMode: 'vertical-rl' }}
          >
            Hands
          </span>
        </button>

        <section
          id="hand-guide-panel"
          className={cn(
            HAND_GUIDE_PANEL_CLASS,
            'flex flex-col overflow-hidden border-l border-gold/25 bg-background/98 shadow-2xl shadow-black/60',
            !open && 'pointer-events-none invisible',
          )}
          aria-hidden={!open}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-border/70 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-gold/80">
                Hand Guide
              </p>
              <h2 className="text-lg font-black tracking-tight">Poker Hands</h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-9 min-h-9 min-w-9 rounded-full"
              onClick={onToggle}
              aria-label="Close hand guide"
            >
              <X className="size-4" aria-hidden />
            </Button>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {HAND_RANKINGS.map((hand, index) => {
                const percent = getHandCompletionDisplayPercent(
                  hand.name,
                  currentHandLabel,
                  completionOdds,
                )
                const isCurrentHand = currentHandLabel === hand.name

                return (
                <div
                  key={hand.name}
                  className={cn(
                    'grid grid-cols-[1.5rem_1fr] gap-2 rounded-xl border p-2.5',
                    isCurrentHand
                      ? 'border-emerald-500/40 bg-emerald-500/10'
                      : 'border-border/60 bg-card/80',
                  )}
                >
                  <div className="grid size-6 place-items-center rounded-full bg-gold/15 text-[10px] font-black text-gold">
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate text-sm font-bold text-foreground">
                        {hand.name}
                      </h3>
                      {typeof percent === 'number' && (
                        <span className="shrink-0 text-[10px] font-semibold tabular-nums text-emerald-300/90 sm:text-xs">
                          完成 {percent}%
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex gap-1">
                      {hand.cards.map((card, cardIndex) => (
                        <PlayingCard
                          key={card.id}
                          card={card}
                          size="mini"
                          dimmed={cardIndex >= hand.involvedCount}
                        />
                      ))}
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {hand.description}
                    </p>
                  </div>
                </div>
              )})}
          </div>
        </section>
      </motion.div>
    </>
  )
}

function playTurnSound() {
  const AudioContextClass = getAudioContextClass()
  if (!AudioContextClass) return

  const audioContext = new AudioContextClass()
  const oscillator = audioContext.createOscillator()
  const gain = audioContext.createGain()
  const now = audioContext.currentTime

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(880, now)
  oscillator.frequency.exponentialRampToValueAtTime(660, now + 0.12)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18)

  oscillator.connect(gain)
  gain.connect(audioContext.destination)
  oscillator.start(now)
  oscillator.stop(now + 0.18)
  oscillator.addEventListener('ended', () => void audioContext.close())
}

function playWinSound() {
  const AudioContextClass = getAudioContextClass()
  if (!AudioContextClass) return

  const audioContext = new AudioContextClass()
  const now = audioContext.currentTime
  const masterGain = audioContext.createGain()

  masterGain.gain.setValueAtTime(0.0001, now)
  masterGain.gain.exponentialRampToValueAtTime(0.16, now + 0.02)
  masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.72)
  masterGain.connect(audioContext.destination)

  ;[1320, 1760, 2349].forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    const start = now + index * 0.11

    oscillator.type = 'triangle'
    oscillator.frequency.setValueAtTime(frequency, start)
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.08, start + 0.08)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.12, start + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28)

    oscillator.connect(gain)
    gain.connect(masterGain)
    oscillator.start(start)
    oscillator.stop(start + 0.3)
  })

  window.setTimeout(() => void audioContext.close(), 850)
}

function getAudioContextClass() {
  const audioWindow = window as unknown as {
    AudioContext?: typeof AudioContext
    webkitAudioContext?: typeof AudioContext
  }
  return audioWindow.AudioContext || audioWindow.webkitAudioContext
}
