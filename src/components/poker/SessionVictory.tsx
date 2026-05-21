import { motion } from 'framer-motion'
import { Crown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { PlayerState } from '@/game/types'

interface SessionVictoryProps {
  winner: PlayerState
  onExit?: () => void
}

export function SessionVictory({ winner, onExit }: SessionVictoryProps) {
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-30 grid place-items-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="pointer-events-auto w-full max-w-xs rounded-2xl border border-gold/40 bg-background/95 p-5 text-center shadow-2xl shadow-black/50 backdrop-blur-md"
        initial={{ opacity: 0, y: 24, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      >
        <motion.div
          className="mx-auto mb-3 grid size-14 place-items-center rounded-full bg-gradient-to-br from-gold/30 via-gold/10 to-transparent ring-2 ring-gold/50"
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Crown className="size-8 text-gold" aria-hidden />
        </motion.div>

        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-gold/80">
          Champion
        </p>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-gold">
          優勝！
        </h2>
        <p className="mt-2 text-sm font-semibold text-foreground">
          {winner.name}
        </p>
        <p className="mt-3 rounded-full border border-gold/25 bg-gold/10 px-4 py-1.5 text-lg font-bold tabular-nums text-gold">
          {winner.chips.toLocaleString()} chips
        </p>

        {onExit && (
          <Button
            variant="casino"
            size="lg"
            className="mt-5 w-full"
            onClick={onExit}
          >
            メニューへ戻る
          </Button>
        )}
      </motion.div>
    </motion.div>
  )
}
