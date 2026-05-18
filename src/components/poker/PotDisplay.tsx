import { motion } from 'framer-motion'

import { Badge } from '@/components/ui/badge'
import { PHASE_LABELS } from '@/game/constants'
import type { GamePhase } from '@/game/types'

interface PotDisplayProps {
  pot: number
  phase: GamePhase
  label?: string
}

export function PotDisplay({ pot, phase, label }: PotDisplayProps) {
  return (
    <motion.div
      className="flex flex-col items-center gap-2"
      layout
    >
      <Badge variant="gold" className="uppercase tracking-wider">
        {label ?? PHASE_LABELS[phase]}
      </Badge>
      <motion.div
        key={pot}
        initial={{ scale: 1.15, color: 'var(--gold)' }}
        animate={{ scale: 1 }}
        className="text-center"
      >
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Pot
        </p>
        <p className="text-2xl font-bold tabular-nums text-gold sm:text-3xl">
          {pot.toLocaleString()}
        </p>
      </motion.div>
    </motion.div>
  )
}
