import { useState } from 'react'
import { motion } from 'framer-motion'
import { Spade } from 'lucide-react'

import { PokerTable } from '@/components/poker/PokerTable'
import { Button } from '@/components/ui/button'
import {
  BIG_BLIND,
  DEFAULT_PLAYER_COUNT,
  DEFAULT_STACK_BB,
  MAX_PLAYERS,
  MIN_PLAYERS,
  SMALL_BLIND,
  STACK_BB_OPTIONS,
  type StackBbOption,
} from '@/game/constants'
import {
  normalizeGameConfig,
  startingChipsFromStackBb,
  type GameConfig,
} from '@/game/gameConfig'

const PLAYER_COUNT_OPTIONS = Array.from(
  { length: MAX_PLAYERS - MIN_PLAYERS + 1 },
  (_, index) => MIN_PLAYERS + index,
)

interface SetupDraft {
  playerCount: number
  startingStackBb: StackBbOption
}

const DEFAULT_SETUP: SetupDraft = {
  playerCount: DEFAULT_PLAYER_COUNT,
  startingStackBb: DEFAULT_STACK_BB,
}

function setupToGameConfig(draft: SetupDraft): GameConfig {
  return normalizeGameConfig({
    playerCount: draft.playerCount,
    startingChips: startingChipsFromStackBb(draft.startingStackBb),
    smallBlind: SMALL_BLIND,
    bigBlind: BIG_BLIND,
  })
}

function App() {
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null)
  const [draft, setDraft] = useState<SetupDraft>(DEFAULT_SETUP)

  if (gameConfig) {
    return (
      <div className="night-city-bg dark h-dvh overflow-hidden bg-background text-foreground">
        <PokerTable
          gameConfig={gameConfig}
          onExit={() => setGameConfig(null)}
        />
      </div>
    )
  }

  return (
    <div className="night-city-bg dark h-dvh overflow-hidden bg-background text-foreground">
      <main className="relative mx-auto flex h-dvh w-full max-w-lg items-center justify-center overflow-hidden px-6">
        <div className="pointer-events-none absolute inset-0 grid place-items-center opacity-70">
          <div className="aspect-[7/4] w-[min(86vw,30rem)] rounded-[50%] border-4 border-gold/20 felt-gradient table-rim" />
        </div>

        <motion.section
          className="relative z-10 flex w-full max-w-sm flex-col items-center text-center"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        >
          <motion.div
            className="mb-4 grid size-14 place-items-center rounded-full border border-gold/35 bg-card/85 shadow-2xl shadow-black/40"
            initial={{ scale: 0.86, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 18 }}
          >
            <Spade className="size-7 text-gold" aria-hidden />
          </motion.div>

          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.35em] text-gold/80">
            Texas Hold&apos;em
          </p>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Couch Hold&apos;em
          </h1>

          <div className="mt-6 w-full space-y-3 rounded-2xl border border-border/70 bg-card/85 p-4 text-left shadow-xl shadow-black/30">
            <label className="block space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Players
              </span>
              <select
                value={draft.playerCount}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    playerCount: Number(event.target.value),
                  }))
                }
                className="h-10 w-full rounded-md border border-border bg-input px-3 text-sm font-semibold tabular-nums text-foreground outline-none focus:ring-2 focus:ring-ring/50"
              >
                {PLAYER_COUNT_OPTIONS.map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Starting Stack
              </span>
              <select
                value={draft.startingStackBb}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    startingStackBb: Number(event.target.value) as StackBbOption,
                  }))
                }
                className="h-10 w-full rounded-md border border-border bg-input px-3 text-sm font-semibold tabular-nums text-foreground outline-none focus:ring-2 focus:ring-ring/50"
              >
                {STACK_BB_OPTIONS.map((bb) => (
                  <option key={bb} value={bb}>
                    {bb} BB ({startingChipsFromStackBb(bb).toLocaleString()})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <Button
            className="mt-6 h-12 rounded-full px-8 text-sm font-bold uppercase tracking-[0.2em] shadow-lg shadow-black/30"
            variant="casino"
            onClick={() => setGameConfig(setupToGameConfig(draft))}
          >
            Shuffle Up and Deal
          </Button>
        </motion.section>
      </main>
    </div>
  )
}

export default App
