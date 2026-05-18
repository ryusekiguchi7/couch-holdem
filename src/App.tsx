import { useState } from 'react'
import { motion } from 'framer-motion'
import { Spade } from 'lucide-react'

import { PokerTable } from '@/components/poker/PokerTable'
import { Button } from '@/components/ui/button'

function App() {
  const [hasStarted, setHasStarted] = useState(false)

  return (
    <div className="night-city-bg dark min-h-svh bg-background text-foreground">
      {hasStarted ? (
        <PokerTable onExit={() => setHasStarted(false)} />
      ) : (
        <main className="relative mx-auto flex min-h-svh w-full max-w-lg items-center justify-center overflow-hidden px-6">
          <div className="pointer-events-none absolute inset-0 grid place-items-center opacity-70">
            <div className="aspect-[7/4] w-[min(86vw,30rem)] rounded-[50%] border-4 border-gold/20 felt-gradient table-rim" />
          </div>

          <motion.section
            className="relative z-10 flex w-full flex-col items-center text-center"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
          >
            <motion.div
              className="mb-5 grid size-16 place-items-center rounded-full border border-gold/35 bg-card/85 shadow-2xl shadow-black/40"
              initial={{ scale: 0.86, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 18 }}
            >
              <Spade className="size-8 text-gold" aria-hidden />
            </motion.div>

            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.35em] text-gold/80">
              Texas Hold&apos;em
            </p>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
              Couch Hold&apos;em
            </h1>
            <p className="mt-3 max-w-xs text-sm leading-6 text-muted-foreground">
              Take a seat, read the table, and play a quick hand against the bots.
            </p>

            <Button
              className="mt-9 h-12 rounded-full px-8 text-sm font-bold uppercase tracking-[0.2em] shadow-lg shadow-black/30"
              variant="casino"
              onClick={() => setHasStarted(true)}
            >
              Shuffle Up and Deal
            </Button>
          </motion.section>
        </main>
      )}
    </div>
  )
}

export default App
