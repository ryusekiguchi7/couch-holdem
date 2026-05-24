import { type PanInfo, motion } from 'framer-motion'

import {
  CARD_BACKGROUND,
  CARD_FACE_BACKGROUND,
  CARD_FACE_BACKGROUND_DEFAULT,
  SUIT_COLOR,
  SUIT_SYMBOL,
} from '@/game/constants'
import type { Card } from '@/game/types'
import { cn } from '@/lib/utils'

interface PlayingCardProps {
  card?: Card | null
  faceDown?: boolean
  dimmed?: boolean
  size?: 'default' | 'mini'
  dealFrom?: { x: number; y: number; rotate?: number }
  className?: string
  layoutId?: string
  enableDragReorder?: boolean
  playDealAnimation?: boolean
  delay?: number
  onDragReorderEnd?: (info: PanInfo) => void
}

export function PlayingCard({
  card,
  faceDown = false,
  dimmed = false,
  size = 'default',
  dealFrom,
  className,
  layoutId,
  enableDragReorder = false,
  playDealAnimation = true,
  delay = 0,
  onDragReorderEnd,
}: PlayingCardProps) {
  const showFace = !faceDown && card
  const showDeal = playDealAnimation && Boolean(dealFrom)
  const faceStyle = card
    ? CARD_FACE_BACKGROUND[card.suit]
    : CARD_FACE_BACKGROUND_DEFAULT

  return (
    <motion.div
      layout={enableDragReorder || Boolean(layoutId)}
      layoutId={layoutId}
      drag={enableDragReorder ? 'x' : false}
      dragConstraints={{ left: -52, right: 52 }}
      dragElastic={0.18}
      dragSnapToOrigin
      whileDrag={{ scale: 1.05, zIndex: 50 }}
      onDragEnd={(_, info) => onDragReorderEnd?.(info)}
      whileTap={enableDragReorder ? { scale: 0.98 } : undefined}
      initial={
        showDeal
          ? {
              opacity: 0,
              x: dealFrom?.x ?? 0,
              y: dealFrom?.y ?? 24,
              rotate: dealFrom?.rotate ?? 0,
              scale: 0.62,
            }
          : false
      }
      animate={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
      transition={{
        layout: { type: 'spring', stiffness: 480, damping: 34 },
        opacity: { duration: showDeal ? 0.2 : 0 },
        x: showDeal ? { type: 'spring', stiffness: 210, damping: 20, delay } : { duration: 0 },
        y: showDeal ? { type: 'spring', stiffness: 210, damping: 20, delay } : { duration: 0 },
        rotate: showDeal ? { type: 'spring', stiffness: 210, damping: 20, delay } : { duration: 0 },
        scale: showDeal ? { type: 'spring', stiffness: 210, damping: 20, delay } : { duration: 0 },
      }}
      className={cn(
        'relative shrink-0 touch-none',
        enableDragReorder && 'cursor-grab active:cursor-grabbing',
        size === 'mini'
          ? 'h-9 w-6'
          : 'h-[clamp(3.45rem,13svw,5rem)] w-[clamp(2.45rem,9.4svw,3.5rem)]',
        '[perspective:800px]',
        dimmed &&
          'opacity-55 saturate-[0.35] brightness-[0.42] contrast-[0.85]',
        className,
      )}
      style={{ transformStyle: 'preserve-3d' }}
    >
      <motion.div
        className="absolute inset-0 rounded-md shadow-lg"
        initial={false}
        animate={{ rotateY: showFace ? 0 : 180 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <motion.div
          className={cn(
            'absolute inset-0 flex items-center justify-center rounded-md border-2 shadow-inner',
            CARD_BACKGROUND.back.bg,
            CARD_BACKGROUND.back.border,
          )}
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <div
            className={cn(
              'h-[85%] w-[85%] rounded-[0.2rem] border border-gold/20',
              CARD_BACKGROUND.back.pattern,
            )}
          />
        </motion.div>

        <motion.div
          className={cn(
            'absolute inset-0 flex items-center justify-center rounded-md border shadow-md',
            faceStyle.bg,
            faceStyle.border,
          )}
          style={{ backfaceVisibility: 'hidden' }}
        >
          {card && (
            <motion.span
              className={cn(
                'select-none font-bold leading-none tracking-tight',
                size === 'mini' ? 'text-[0.72rem]' : 'text-2xl sm:text-3xl',
                SUIT_COLOR[card.suit],
              )}
              initial={showDeal ? { scale: 0.6, opacity: 0 } : false}
              animate={{ scale: 1, opacity: 1 }}
              transition={
                showDeal
                  ? { delay: delay + 0.15, type: 'spring', stiffness: 320 }
                  : { duration: 0 }
              }
              aria-label={`${card.rank} of ${card.suit}`}
            >
              {card.rank}
              {SUIT_SYMBOL[card.suit]}
            </motion.span>
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
