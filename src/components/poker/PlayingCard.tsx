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
  draggable?: boolean
  delay?: number
  onSwipeFold?: () => void
}

export function PlayingCard({
  card,
  faceDown = false,
  dimmed = false,
  size = 'default',
  dealFrom,
  className,
  layoutId,
  draggable = false,
  delay = 0,
  onSwipeFold,
}: PlayingCardProps) {
  const showFace = !faceDown && card
  const faceStyle = card
    ? CARD_FACE_BACKGROUND[card.suit]
    : CARD_FACE_BACKGROUND_DEFAULT

  return (
    <motion.div
      layoutId={layoutId}
      drag={draggable}
      dragConstraints={{ top: -120, bottom: 40, left: -70, right: 70 }}
      dragElastic={0.16}
      whileDrag={{ scale: 1.06, zIndex: 50, rotate: 2 }}
      onDragEnd={(_, info) => handleDragEnd(info, onSwipeFold)}
      whileTap={{ scale: 0.97 }}
      initial={{
        opacity: 0,
        x: dealFrom?.x ?? 0,
        y: dealFrom?.y ?? 24,
        rotate: dealFrom?.rotate ?? 0,
        scale: dealFrom ? 0.62 : 1,
      }}
      animate={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: dealFrom ? 210 : 260,
        damping: dealFrom ? 20 : 22,
        delay,
      }}
      className={cn(
        'relative shrink-0 cursor-grab touch-none active:cursor-grabbing',
        size === 'mini'
          ? 'h-9 w-6'
          : 'h-[clamp(3.45rem,13svw,5rem)] w-[clamp(2.45rem,9.4svw,3.5rem)]',
        '[perspective:800px]',
        dimmed && 'opacity-45 grayscale brightness-50',
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
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: delay + 0.15, type: 'spring', stiffness: 320 }}
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

function handleDragEnd(info: PanInfo, onSwipeFold?: () => void) {
  const swipedAway = info.offset.y < -64 || info.velocity.y < -650
  if (swipedAway) onSwipeFold?.()
}
