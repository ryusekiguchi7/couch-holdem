import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'

import { Button } from '@/components/ui/button'
import {
  chipsToBb,
  formatChipAmount,
  formatChipAmountForInput,
  parseChipAmountInput,
} from '@/lib/chipFormat'

interface ActionBarProps {
  disabled?: boolean
  disableFold?: boolean
  foldLabel?: string
  bigBlind: number
  showAmountsInBb: boolean
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
  foldLabel = 'Fold',
  bigBlind,
  showAmountsInBb,
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
  const [amount, setAmount] = useState(() =>
    formatChipAmountForInput(minimumTarget, bigBlind, showAmountsInBb),
  )

  useEffect(() => {
    setAmount(formatChipAmountForInput(minimumTarget, bigBlind, showAmountsInBb))
  }, [bigBlind, minimumTarget, showAmountsInBb])

  const inputMin = showAmountsInBb
    ? chipsToBb(minimumTarget, bigBlind)
    : minimumTarget
  const inputMax = showAmountsInBb ? chipsToBb(maxTarget, bigBlind) : maxTarget

  const parsedChips = parseChipAmountInput(amount, bigBlind, showAmountsInBb)
  const submittedTarget =
    parsedChips !== null
      ? Math.min(maxTarget, Math.max(minimumTarget, Math.floor(parsedChips)))
      : minimumTarget

  function submit(targetBet = submittedTarget) {
    if (!canBetOrRaise) return
    onBet?.(targetBet)
  }

  function previewTarget(targetBet: number) {
    setAmount(formatChipAmountForInput(targetBet, bigBlind, showAmountsInBb))
  }

  function potTarget(percent: number) {
    return Math.min(maxTarget, Math.max(minimumTarget, Math.round(pot * percent)))
  }

  function raiseTarget(multiplier: number) {
    return Math.min(maxTarget, Math.max(minimumTarget, Math.round(currentBet * multiplier)))
  }

  const callLabel =
    toCall > 0
      ? `Call ${formatChipAmount(toCall, bigBlind, showAmountsInBb)}`
      : 'Check'

  return (
    <motion.div
      className="z-20 shrink-0 space-y-1.5 border-t border-border/60 bg-background/95 px-3 pt-2 pb-[calc(max(0.5rem,env(safe-area-inset-bottom))+0.35rem)] backdrop-blur-md"
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28, delay: 0.15 }}
    >
      <div className="grid grid-cols-[7fr_3fr] gap-2">
        <Button
          variant="outline"
          size="default"
          disabled={!canBetOrRaise}
          onClick={() => submit()}
          className="h-10 min-h-10 border-red-500/50 bg-red-500/20 px-4 text-xs font-bold uppercase tracking-wide text-red-200 hover:bg-red-500/30 hover:text-red-100"
        >
          {isRaise ? 'Raise' : 'Bet'}
        </Button>
        <input
          type="number"
          min={inputMin}
          max={inputMax}
          step={showAmountsInBb ? 0.1 : 1}
          value={amount}
          disabled={!canBetOrRaise}
          onChange={(event) => setAmount(event.target.value)}
          className="h-10 min-w-0 rounded-md border border-border bg-input px-3 text-center text-sm font-semibold tabular-nums text-red-300 outline-none focus:ring-2 focus:ring-ring/50 disabled:opacity-50"
          aria-label={
            showAmountsInBb
              ? isRaise
                ? 'Raise amount in big blinds'
                : 'Bet amount in big blinds'
              : isRaise
                ? 'Raise amount'
                : 'Bet amount'
          }
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
              className="h-8 min-h-8 px-1 text-[11px] text-red-300"
            >
              {Math.round(percent * 100)}%
            </Button>
          ))}
          <Button
            variant="secondary"
            size="sm"
            disabled={!canBetOrRaise}
            onClick={() => previewTarget(maxTarget)}
            className="h-8 min-h-8 px-1 text-[11px] text-red-300"
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
              className="h-8 min-h-8 px-1 text-[11px] text-red-300"
            >
              x{multiplier}
            </Button>
          ))}
          <Button
            variant="secondary"
            size="sm"
            disabled={!canBetOrRaise}
            onClick={() => previewTarget(maxTarget)}
            className="h-8 min-h-8 px-1 text-[11px] text-red-300"
          >
            Max
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="lg"
          disabled={disableFold}
          onClick={onFold}
          className="h-10 min-h-10 border-blue-500/50 text-blue-300 hover:bg-blue-500/15 hover:text-blue-200"
        >
          {foldLabel}
        </Button>
        <Button
          variant="outline"
          size="lg"
          disabled={disabled}
          onClick={onCheck}
          className="h-10 min-h-10 border-green-500/50 bg-green-500/15 text-green-300 hover:bg-green-500/25 hover:text-green-200"
        >
          {callLabel}
        </Button>
      </div>
    </motion.div>
  )
}
