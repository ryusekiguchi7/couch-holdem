import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, type PanInfo, motion } from 'framer-motion'
import { Coins } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import type { PlayerState } from '@/game/types'
import { formatChipAmount } from '@/lib/chipFormat'
import { cn } from '@/lib/utils'

import { PlayingCard } from './PlayingCard'

const CARD_SWAP_DRAG_THRESHOLD = 28

interface PlayerSeatProps {
  player: PlayerState
  bigBlind: number
  showStackInBb: boolean
  onStackDisplayToggle: () => void
  showCards?: boolean
  handLabel?: string
  isWinner?: boolean
}

export function PlayerSeat({
  player,
  bigBlind,
  showStackInBb,
  onStackDisplayToggle,
  showCards = false,
  handLabel,
  isWinner = false,
}: PlayerSeatProps) {
  const revealCards = showCards || player.isHuman
  const actionText = getActionText(player, bigBlind, showStackInBb)
  const showHand = !player.hasFolded
  const canReorderCards =
    player.isHuman && revealCards && player.holeCards.length === 2 && showHand
  const [holeCardOrder, setHoleCardOrder] = useState([0, 1])
  const holeHandKey = `${player.holeCards[0]?.id ?? ''}:${player.holeCards[1]?.id ?? ''}`
  const dealtHandKeyRef = useRef('')
  const playHoleCardDeal =
    holeHandKey !== '' && dealtHandKeyRef.current !== holeHandKey

  useEffect(() => {
    setHoleCardOrder([0, 1])
    if (holeHandKey) {
      dealtHandKeyRef.current = holeHandKey
    }
  }, [holeHandKey])

  function handleCardDragEnd(displayIndex: 0 | 1, info: PanInfo) {
    const draggedPastSibling =
      (displayIndex === 0 && info.offset.x > CARD_SWAP_DRAG_THRESHOLD) ||
      (displayIndex === 1 && info.offset.x < -CARD_SWAP_DRAG_THRESHOLD)

    if (draggedPastSibling) {
      setHoleCardOrder(([left, right]) => [right, left])
    }
  }

  return (
    <motion.div
      layout
      className={cn(
        'flex w-[clamp(5.6rem,28vw,8.5rem)] flex-col items-center gap-1 rounded-xl p-1 sm:gap-1.5',
        isWinner && 'bg-gold/15 ring-2 ring-gold/60',
      )}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 220, damping: 24 }}
    >
      <AnimatePresence>
        {showHand && (
          <motion.div
            className="order-2 flex min-w-0 shrink-0 flex-row gap-0.5 sm:gap-1"
            animate={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
            exit={{
              x: getFoldDiscardMotion(player.seatIndex).x,
              y: getFoldDiscardMotion(player.seatIndex).y,
              opacity: 0,
              rotate: getFoldDiscardMotion(player.seatIndex).rotate,
              scale: 0.72,
            }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          >
            {player.holeCards.length > 0 ? (
              holeCardOrder.map((cardIndex, displayIndex) => {
                const card = player.holeCards[cardIndex]
                if (!card) return null

                return (
                  <PlayingCard
                    key={card.id}
                    card={card}
                    faceDown={!revealCards}
                    dealFrom={getDealMotion(player.seatIndex, cardIndex)}
                    delay={player.seatIndex * 0.06 + cardIndex * 0.1}
                    playDealAnimation={playHoleCardDeal}
                    enableDragReorder={canReorderCards}
                    onDragReorderEnd={(info) =>
                      handleCardDragEnd(displayIndex as 0 | 1, info)
                    }
                  />
                )
              })
            ) : (
              <>
                <PlayingCard
                  faceDown
                  dealFrom={getDealMotion(player.seatIndex, 0)}
                  delay={0}
                />
                <PlayingCard
                  faceDown
                  dealFrom={getDealMotion(player.seatIndex, 1)}
                  delay={0.08}
                />
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={cn(
          'order-1 min-h-5 min-w-[4.7rem] rounded-md border px-2 py-0.5 text-center text-[9px] font-bold uppercase tracking-wide shadow-sm sm:text-[10px]',
          player.hasFolded
            ? 'border-muted bg-muted/70 text-muted-foreground'
            : player.isActive
              ? 'border-gold/70 bg-gold/20 text-gold'
              : player.lastAction
                ? getActionDisplayClass(player.lastAction)
                : 'border-transparent bg-transparent text-transparent shadow-none',
        )}
      >
        {typeof player.actionAmount === 'number' ? (
          <span className="inline-flex items-center justify-center gap-1">
            <span>{player.lastAction}</span>
            <Coins className="size-3" aria-hidden />
            <span className="tabular-nums">
              {formatChipAmount(player.actionAmount, bigBlind, showStackInBb)}
            </span>
          </span>
        ) : (
          actionText
        )}
      </div>

      <div className="order-3 flex min-w-0 flex-col items-center gap-0.5 sm:gap-1">
        <div className="flex max-w-full flex-nowrap items-center justify-center gap-1">
          <span
            className={cn(
              'max-w-[4.2rem] truncate text-[10px] font-medium sm:max-w-[5rem] sm:text-xs',
              player.isActive ? 'text-gold' : 'text-muted-foreground',
            )}
          >
            {player.name}
          </span>
          {player.isDealer && (
            <Badge
              variant="outline"
              className="border-red-500/45 bg-red-500/20 px-1 py-0 text-[9px] text-red-300"
            >
              BTN
            </Badge>
          )}
          {player.blind && (
            <Badge variant="secondary" className="px-1 py-0 text-[9px]">
              {player.blind === 'small' ? 'SB' : 'BB'}
            </Badge>
          )}
          {player.position && (
            <Badge variant="secondary" className="px-1 py-0 text-[9px]">
              {player.position}
            </Badge>
          )}
          {isWinner && (
            <Badge variant="gold" className="px-1 py-0 text-[9px]">
              Win
            </Badge>
          )}
        </div>

        <button
          type="button"
          onClick={onStackDisplayToggle}
          aria-pressed={showStackInBb}
          aria-label={
            showStackInBb
              ? `Stack ${formatChipAmount(player.chips, bigBlind, true)}, show chips`
              : `Stack ${player.chips.toLocaleString()} chips, show big blinds`
          }
          className="flex cursor-pointer items-center gap-1 rounded-full border border-border/60 bg-black/25 px-1.5 py-0.5 text-[9px] backdrop-blur-sm transition-colors hover:border-gold/40 hover:bg-black/40 sm:px-2 sm:text-[11px]"
        >
          <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
            {showStackInBb ? 'BB' : 'Stack'}
          </span>
          <span className="font-semibold tabular-nums text-foreground">
            {formatChipAmount(player.chips, bigBlind, showStackInBb)}
          </span>
          {typeof player.handDelta === 'number' && player.handDelta > 0 && (
            <span className="text-gold">
              +{formatChipAmount(player.handDelta, bigBlind, showStackInBb)}
            </span>
          )}
        </button>

        {handLabel && !player.hasFolded && (
          <p className="max-w-full truncate text-center text-[9px] font-medium text-emerald-300/90 sm:text-[10px]">
            {handLabel}
          </p>
        )}
      </div>
    </motion.div>
  )
}

function getActionDisplayClass(lastAction: string) {
  const action = lastAction.toLowerCase()

  if (action === 'fold') {
    return 'border-blue-400/40 bg-blue-500/15 text-blue-300'
  }

  if (action === 'check' || action === 'call') {
    return 'border-green-400/40 bg-green-500/15 text-green-300'
  }

  if (action === 'bet' || action === 'raise' || action === 'all-in') {
    return 'border-red-400/40 bg-red-500/15 text-red-300'
  }

  return 'border-muted/60 bg-muted/40 text-muted-foreground'
}

function getActionText(
  player: PlayerState,
  bigBlind: number,
  showStackInBb: boolean,
) {
  if (player.lastAction) {
    return typeof player.actionAmount === 'number'
      ? `${player.lastAction} ${formatChipAmount(player.actionAmount, bigBlind, showStackInBb)}`
      : player.lastAction
  }

  return player.isActive ? 'To Act' : ''
}

function getFoldDiscardMotion(seatIndex: number) {
  const motions = [
    { x: 0, y: -88, rotate: -18 },
    { x: 72, y: -42, rotate: 22 },
    { x: 58, y: 52, rotate: 18 },
    { x: 0, y: 84, rotate: -16 },
    { x: -58, y: 52, rotate: -22 },
    { x: -72, y: -42, rotate: 18 },
  ]

  return motions[seatIndex] ?? motions[0]
}

function getDealMotion(seatIndex: number, cardIndex: number) {
  const motions = [
    { x: 0, y: -120, rotate: -10 },
    { x: 120, y: -80, rotate: 16 },
    { x: 120, y: 90, rotate: -14 },
    { x: 0, y: 120, rotate: 12 },
    { x: -120, y: 90, rotate: 14 },
    { x: -120, y: -80, rotate: -16 },
  ]
  const motion = motions[seatIndex] ?? motions[0]

  return {
    x: motion.x + cardIndex * 10,
    y: motion.y + cardIndex * 4,
    rotate: motion.rotate + cardIndex * 6,
  }
}
