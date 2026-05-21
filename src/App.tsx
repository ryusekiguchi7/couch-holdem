import { useState } from 'react'
import { motion } from 'framer-motion'
import { Spade } from 'lucide-react'

import { PokerTable } from '@/components/poker/PokerTable'
import { Button } from '@/components/ui/button'
import { MAX_PLAYERS } from '@/game/constants'
import {
  DEFAULT_GAME_CONFIG,
  normalizeGameConfig,
  type GameConfig,
} from '@/game/gameConfig'

function App() {
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null)
  const [draft, setDraft] = useState<GameConfig>(DEFAULT_GAME_CONFIG)

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
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            人数・スタック・ブラインドを決めてから開始
          </p>

          <div className="mt-6 w-full space-y-3 rounded-2xl border border-border/70 bg-card/85 p-4 text-left shadow-xl shadow-black/30">
            <label className="block space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Players ({2}–{MAX_PLAYERS})
              </span>
              <input
                type="number"
                min={2}
                max={MAX_PLAYERS}
                value={draft.playerCount}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    playerCount: Number(event.target.value),
                  }))
                }
                className="h-10 w-full rounded-md border border-border bg-input px-3 text-sm font-semibold tabular-nums text-foreground outline-none focus:ring-2 focus:ring-ring/50"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Starting Stack
              </span>
              <input
                type="number"
                min={1}
                value={draft.startingChips}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    startingChips: Number(event.target.value),
                  }))
                }
                className="h-10 w-full rounded-md border border-border bg-input px-3 text-sm font-semibold tabular-nums text-foreground outline-none focus:ring-2 focus:ring-ring/50"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Small Blind
                </span>
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={draft.smallBlind}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      smallBlind: Number(event.target.value),
                    }))
                  }
                  className="h-10 w-full rounded-md border border-border bg-input px-3 text-sm font-semibold tabular-nums text-foreground outline-none focus:ring-2 focus:ring-ring/50"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Big Blind
                </span>
                <input
                  type="number"
                  min={draft.smallBlind}
                  step={0.5}
                  value={draft.bigBlind}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      bigBlind: Number(event.target.value),
                    }))
                  }
                  className="h-10 w-full rounded-md border border-border bg-input px-3 text-sm font-semibold tabular-nums text-foreground outline-none focus:ring-2 focus:ring-ring/50"
                />
              </label>
            </div>
          </div>

          <Button
            className="mt-6 h-12 rounded-full px-8 text-sm font-bold uppercase tracking-[0.2em] shadow-lg shadow-black/30"
            variant="casino"
            onClick={() => setGameConfig(normalizeGameConfig(draft))}
          >
            Shuffle Up and Deal
          </Button>
        </motion.section>
      </main>
    </div>
  )
}

export default App
