import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'

import { Button } from '@/components/ui/button'

interface ActionBarProps {
  disabled?: boolean
  disableFold?: boolean
  pot: number
  currentBet: number
  minRaise: number
  playerBet: number
  playerChips: number
  onFold?: () => void
  onCheck?: () => void
  onBet?: (targetBet: number) => void
}

export function ActionBar({
  disabled = false,
  disableFold = false,
  pot,
  currentBet,
  minRaise,
  playerBet,
  playerChips,
  onFold,
  onCheck,
  onBet,
}: ActionBarProps) {
  const toCall = Math.max(0, currentBet - playerBet)
  const maxTarget = playerBet + playerChips
  const canBetOrRaise = !disabled && playerChips > toCall
  const isRaise = currentBet > 0
  const minimumTarget = useMemo(() => {
    if (isRaise) return Math.min(maxTarget, currentBet + minRaise)
    return Math.min(maxTarget, Math.max(minRaise, 1))
  }, [currentBet, isRaise, maxTarget, minRaise])
  const [amount, setAmount] = useState(String(minimumTarget))

  useEffect(() => {
    setAmount(String(minimumTarget))
  }, [minimumTarget])

  const parsedAmount = Number(amount)
  const submittedTarget = Number.isFinite(parsedAmount)
    ? Math.min(maxTarget, Math.max(minimumTarget, Math.floor(parsedAmount)))
    : minimumTarget

  function submit(targetBet = submittedTarget) {
    if (!canBetOrRaise) return
    onBet?.(targetBet)
  }

  function previewTarget(targetBet: number) {
    setAmount(String(targetBet))
  }

  function potTarget(percent: number) {
    return Math.min(maxTarget, Math.max(minimumTarget, Math.round(pot * percent)))
  }

  function raiseTarget(multiplier: number) {
    return Math.min(maxTarget, Math.max(minimumTarget, Math.round(currentBet * multiplier)))
  }

  return (
    <motion.div
      className="sticky bottom-0 z-20 space-y-1.5 border-t border-border/60 bg-background/95 px-3 pt-2 pb-[calc(max(1rem,env(safe-area-inset-bottom))+0.75rem)] backdrop-blur-md"
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28, delay: 0.15 }}
    >
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="lg"
          disabled={disabled || disableFold}
          onClick={onFold}
          className="h-10 min-h-10 border-destructive/50 text-destructive hover:bg-destructive/10"
        >
          Fold
        </Button>
        <Button
          variant="secondary"
          size="lg"
          disabled={disabled}
          onClick={onCheck}
          className="h-10 min-h-10"
        >
          {toCall > 0 ? `Call ${toCall}` : 'Check'}
        </Button>
      </div>

      <div className="grid grid-cols-[7fr_3fr] gap-2">
        <Button
          variant="casino"
          size="default"
          disabled={!canBetOrRaise}
          onClick={() => submit()}
          className="h-10 min-h-10 px-4 text-xs font-bold uppercase tracking-wide"
        >
          {isRaise ? 'Raise' : 'Bet'}
        </Button>
        <input
          type="number"
          min={minimumTarget}
          max={maxTarget}
          value={amount}
          disabled={!canBetOrRaise}
          onChange={(event) => setAmount(event.target.value)}
          className="h-10 min-w-0 rounded-md border border-border bg-input px-3 text-center text-sm font-semibold tabular-nums text-foreground outline-none focus:ring-2 focus:ring-ring/50 disabled:opacity-50"
          aria-label={isRaise ? 'Raise amount' : 'Bet amount'}
        />
      </div>

      {!isRaise ? (
        <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
          {[0.25, 0.33, 0.5, 0.75, 1].map((percent) => (
            <Button
              key={percent}
              variant="secondary"
              size="sm"
              disabled={!canBetOrRaise}
              onClick={() => previewTarget(potTarget(percent))}
              className="h-8 min-h-8 px-1 text-[11px]"
            >
              {Math.round(percent * 100)}%
            </Button>
          ))}
          <Button
            variant="secondary"
            size="sm"
            disabled={!canBetOrRaise}
            onClick={() => previewTarget(maxTarget)}
            className="h-8 min-h-8 px-1 text-[11px]"
          >
            Max
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
          {[2, 2.5, 3, 4, 5].map((multiplier) => (
            <Button
              key={multiplier}
              variant="secondary"
              size="sm"
              disabled={!canBetOrRaise}
              onClick={() => previewTarget(raiseTarget(multiplier))}
              className="h-8 min-h-8 px-1 text-[11px]"
            >
              x{multiplier}
            </Button>
          ))}
          <Button
            variant="secondary"
            size="sm"
            disabled={!canBetOrRaise}
            onClick={() => previewTarget(maxTarget)}
            className="h-8 min-h-8 px-1 text-[11px]"
          >
            Max
          </Button>
        </div>
      )}
    </motion.div>
  )
}
