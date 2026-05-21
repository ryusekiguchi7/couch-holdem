import { AnimatePresence, type PanInfo, motion } from 'framer-motion'
import { Coins } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import type { PlayerState } from '@/game/types'
import { cn } from '@/lib/utils'

import { PlayingCard } from './PlayingCard'

interface PlayerSeatProps {
  player: PlayerState
  showCards?: boolean
  handLabel?: string
  isWinner?: boolean
  onSwipeFold?: () => void
}

export function PlayerSeat({
  player,
  showCards = false,
  handLabel,
  isWinner = false,
  onSwipeFold,
}: PlayerSeatProps) {
  const revealCards = showCards || player.isHuman
  const actionText = getActionText(player)
  const canSwipeFold = Boolean(player.isHuman && player.isActive && !player.hasFolded)
  const showHand = !player.hasFolded

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
            drag={canSwipeFold}
            dragConstraints={{ top: -120, bottom: 40, left: -70, right: 70 }}
            dragElastic={0.16}
            dragSnapToOrigin
            whileDrag={{ scale: 1.06, zIndex: 50, rotate: 2 }}
            onDragEnd={(_, info) => handleSwipeFold(info, onSwipeFold)}
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
              player.holeCards.map((card, i) => (
                <PlayingCard
                  key={card.id}
                  card={card}
                  faceDown={!revealCards}
                  dealFrom={getDealMotion(player.seatIndex, i)}
                  delay={player.seatIndex * 0.06 + i * 0.1}
                  layoutId={card.id}
                />
              ))
            ) : (
              <>
              <PlayingCard faceDown dealFrom={getDealMotion(player.seatIndex, 0)} delay={0} />
              <PlayingCard faceDown dealFrom={getDealMotion(player.seatIndex, 1)} delay={0.08} />
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
            <span className="tabular-nums">{player.actionAmount}</span>
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

        <div className="flex items-center gap-1 rounded-full border border-border/60 bg-black/25 px-1.5 py-0.5 text-[9px] backdrop-blur-sm sm:px-2 sm:text-[11px]">
          <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
            Stack
          </span>
          <span className="font-semibold tabular-nums text-foreground">
            {player.chips.toLocaleString()}
          </span>
          {typeof player.handDelta === 'number' && player.handDelta > 0 && (
            <span className="text-gold">+{player.handDelta}</span>
          )}
        </div>

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

function getActionText(player: PlayerState) {
  if (player.lastAction) {
    return typeof player.actionAmount === 'number'
      ? `${player.lastAction} ${player.actionAmount}`
      : player.lastAction
  }

  return player.isActive ? 'To Act' : ''
}

function handleSwipeFold(info: PanInfo, onSwipeFold?: () => void) {
  const swipedAway = info.offset.y < -64 || info.velocity.y < -650
  if (swipedAway) onSwipeFold?.()
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
