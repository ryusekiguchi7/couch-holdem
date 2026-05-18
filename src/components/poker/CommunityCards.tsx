import { AnimatePresence, motion } from 'framer-motion'

import type { Card } from '@/game/types'

import { PlayingCard } from './PlayingCard'

interface CommunityCardsProps {
  cards: Card[]
  maxSlots?: number
}

export function CommunityCards({ cards, maxSlots = 5 }: CommunityCardsProps) {
  const slots = Array.from({ length: maxSlots }, (_, i) => cards[i] ?? null)

  return (
    <div className="flex items-center justify-center gap-1">
      <AnimatePresence mode="popLayout">
        {slots.map((card, i) => (
          <motion.div
            key={card?.id ?? `empty-${i}`}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            {card ? (
              <PlayingCard
                card={card}
                dealFrom={{ x: -28 + i * 14, y: 90, rotate: -8 + i * 4 }}
                delay={i * 0.08}
                layoutId={card.id}
              />
            ) : (
              <div className="h-[clamp(3.45rem,13svw,5rem)] w-[clamp(2.45rem,9.4svw,3.5rem)] rounded-lg border border-dashed border-gold/20 bg-black/20" />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
