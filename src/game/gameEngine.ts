import { MAX_PLAYERS } from './constants'
import { normalizeGameConfig, type GameConfig } from './gameConfig'
import type {
  Card,
  GamePhase,
  HandResult,
  PlayerState,
  PotBreakdown,
  Rank,
  Suit,
  TableState,
} from './types'

const AI_NAMES = ['Dealer AI', 'Bot 2', 'Bot 3', 'Bot 4', 'Bot 5', 'Bot 6']
const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']

const RANK_VALUE: Record<Rank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  T: 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
}

const STREET_CARDS: Record<Exclude<GamePhase, 'preflop' | 'showdown'>, number> = {
  flop: 3,
  turn: 1,
  river: 1,
}

type BotDecision =
  | { action: 'check' }
  | { action: 'call' }
  | { action: 'fold' }
  | { action: 'betOrRaise'; targetBet: number }

interface SidePot {
  amount: number
  contribution: number
  contributorCount: number
  eligibleIds: string[]
}

export function createInitialTable(
  configInput: Partial<GameConfig> = {},
  nextDealerSeatIndex?: number,
): TableState {
  const config = normalizeGameConfig(configInput)
  const count = clampPlayerCount(config.playerCount)
  const dealerSeatIndex = nextDealerSeatIndex ?? count - 1
  const deck = shuffleDeck(createDeck())
  const players = createPlayers(count, dealerSeatIndex, config)

  dealHoleCards(players, deck, nextSeat(dealerSeatIndex, count))

  const firstActionSeatIndex = getPreflopFirstActionSeatIndex(
    dealerSeatIndex,
    count,
  )
  const table = setActivePlayer({
    phase: 'preflop',
    pot: 0,
    currentBet: Math.max(...players.map((player) => player.bet)),
    minRaise: config.bigBlind,
    communityCards: [],
    players,
    deck,
    dealerSeatIndex,
    activeSeatIndex: findFirstActionableSeat(players, firstActionSeatIndex),
    checkedSeatIndexes: [],
    actionLog: [],
    winnerIds: [],
    message: '',
    config,
  })

  return maybeFastForwardToShowdown(table)
}

export function getPlayerHandLabel(
  player: PlayerState,
  communityCards: Card[],
): string | undefined {
  if (player.hasFolded || player.holeCards.length < 2) return undefined
  return evaluateBestHand([...player.holeCards, ...communityCards]).label
}

export function startNextHand(table: TableState): TableState {
  const remainingPlayers = reindexPlayersForNextHand(table.players)
  const count = remainingPlayers.length
  const dealerSeatIndex = getNextDealerSeatIndex(
    table.players,
    remainingPlayers,
    table.dealerSeatIndex,
  )
  const deck = shuffleDeck(createDeck())
  const players = resetPlayersForNextHand(
    remainingPlayers,
    dealerSeatIndex,
    table.config,
  )

  dealHoleCards(players, deck, nextSeat(dealerSeatIndex, count))

  const firstActionSeatIndex = getPreflopFirstActionSeatIndex(
    dealerSeatIndex,
    count,
  )
  const nextTable = setActivePlayer({
    phase: 'preflop',
    pot: 0,
    currentBet: Math.max(0, ...players.map((player) => player.bet)),
    minRaise: table.config.bigBlind,
    communityCards: [],
    players,
    deck,
    dealerSeatIndex,
    activeSeatIndex: findFirstActionableSeat(players, firstActionSeatIndex),
    checkedSeatIndexes: [],
    actionLog: [],
    winnerIds: [],
    message: '',
    config: table.config,
  })

  return maybeFastForwardToShowdown(nextTable)
}

export function checkCurrentPlayer(table: TableState): TableState {
  if (table.phase === 'showdown' || table.activeSeatIndex === null) {
    return table
  }

  const activePlayer = table.players.find(
    (player) => player.seatIndex === table.activeSeatIndex,
  )
  if (!activePlayer) return table
  if (!canAct(activePlayer)) {
    return skipPlayerAction(table, activePlayer)
  }

  if (amountToCall(table, activePlayer) > 0) {
    return recordCall(table, activePlayer)
  }

  return recordCheck(table, activePlayer)
}

export function betOrRaiseCurrentPlayer(
  table: TableState,
  targetBet: number,
): TableState {
  if (table.phase === 'showdown' || table.activeSeatIndex === null) {
    return table
  }

  const activePlayer = table.players.find(
    (player) => player.seatIndex === table.activeSeatIndex,
  )
  if (!activePlayer) return table
  if (!canAct(activePlayer)) {
    return skipPlayerAction(table, activePlayer)
  }

  return recordBetOrRaise(table, activePlayer, targetBet)
}

export function foldCurrentPlayer(table: TableState): TableState {
  if (table.phase === 'showdown' || table.activeSeatIndex === null) {
    return table
  }

  const activePlayer = table.players.find(
    (player) => player.seatIndex === table.activeSeatIndex,
  )
  if (!activePlayer) return table
  if (!canAct(activePlayer)) {
    return skipPlayerAction(table, activePlayer)
  }

  if (amountToCall(table, activePlayer) === 0) {
    return table
  }

  return foldPlayer(table, activePlayer)
}

export function actCurrentBot(table: TableState): TableState {
  if (table.phase === 'showdown' || table.activeSeatIndex === null) {
    return table
  }

  const activePlayer = table.players.find(
    (player) => player.seatIndex === table.activeSeatIndex,
  )
  if (!activePlayer || activePlayer.isHuman) return table
  if (!canAct(activePlayer)) {
    return skipPlayerAction(table, activePlayer)
  }

  const decision = decideBotAction(table, activePlayer)
  if (decision.action === 'fold') return foldPlayer(table, activePlayer)
  if (decision.action === 'call') return recordCall(table, activePlayer)
  if (decision.action === 'betOrRaise') {
    return recordBetOrRaise(table, activePlayer, decision.targetBet)
  }

  return recordCheck(table, activePlayer)
}

export function advanceSkippedActions(table: TableState): TableState {
  if (table.phase === 'showdown') return table

  if (table.activeSeatIndex !== null) {
    const activePlayer = table.players.find(
      (player) => player.seatIndex === table.activeSeatIndex,
    )
    return activePlayer && !canAct(activePlayer)
      ? skipPlayerAction(table, activePlayer)
      : table
  }

  const firstActionSeatIndex = getFirstActionSeatIndexForPhase(
    table.phase,
    table.dealerSeatIndex,
    table.players.length,
  )
  const nextSeatIndex = findFirstActionableSeat(table.players, firstActionSeatIndex)

  if (nextSeatIndex !== null) {
    return setActivePlayer({ ...table, activeSeatIndex: nextSeatIndex })
  }

  return advanceStreet(table)
}

export function getPotBreakdown(players: PlayerState[]): PotBreakdown[] {
  const sidePots = buildSidePots(players)
  const hasAllInPlayer = players.some(
    (player) => player.chips === 0 && player.committed > 0,
  )

  if (!hasAllInPlayer || sidePots.length <= 1) {
    return []
  }

  return sidePots.map((sidePot, index) => ({
    label: index === 0 ? 'Main Pot' : `Side Pot ${index}`,
    amount: sidePot.amount,
    formula: `${sidePot.contribution} x ${sidePot.contributorCount}`,
    eligibleNames: players
      .filter((player) => sidePot.eligibleIds.includes(player.id))
      .map((player) => player.name),
  }))
}

function foldPlayer(table: TableState, playerToFold: PlayerState): TableState {
  const players = table.players.map((player) =>
    player.id === playerToFold.id
      ? {
          ...player,
          hasFolded: true,
          isActive: false,
          lastAction: 'Fold',
          actionAmount: undefined,
        }
      : player,
  )
  const nextTable: TableState = {
    ...table,
    players,
    checkedSeatIndexes: table.checkedSeatIndexes.filter(
      (seatIndex) => seatIndex !== playerToFold.seatIndex,
    ),
    actionLog: [...table.actionLog, `${playerToFold.name} folds`],
  }

  const remainingPlayers = activePlayers(nextTable)
  if (remainingPlayers.length <= 1) {
    const winner = remainingPlayers[0]
    const collectedPot = collectCurrentBets(nextTable)
    const paidPlayers = winner
      ? awardPotToWinners(
          nextTable.players,
          [winner.id],
          collectedPot,
          nextTable.dealerSeatIndex,
        )
      : nextTable.players
    return {
      ...setActivePlayer({
        ...nextTable,
        pot: collectedPot,
        players: paidPlayers.map((player) => ({ ...player, bet: 0 })),
        phase: 'showdown',
        currentBet: 0,
        activeSeatIndex: null,
        checkedSeatIndexes: [],
        winnerIds: winner ? [winner.id] : [],
        winningHandLabel: undefined,
      }),
      message: winner
        ? `${winner.name} wins — ${playerToFold.name} folded`
        : 'All players folded',
    }
  }

  if (isBettingRoundComplete(nextTable)) {
    return advanceStreet(nextTable)
  }

  return setActivePlayer({
    ...nextTable,
    activeSeatIndex: nextActiveSeat(nextTable, playerToFold.seatIndex),
  })
}

function skipPlayerAction(table: TableState, player: PlayerState): TableState {
  const checkedSeatIndexes = Array.from(
    new Set([...table.checkedSeatIndexes, player.seatIndex]),
  )
  const nextTable = {
    ...table,
    checkedSeatIndexes,
    players: table.players.map((candidate) =>
      candidate.id === player.id
        ? { ...candidate, lastAction: 'All-in', actionAmount: undefined }
        : candidate,
    ),
  }

  if (isBettingRoundComplete(nextTable)) {
    return advanceStreet(nextTable)
  }

  return setActivePlayer({
    ...nextTable,
    activeSeatIndex: nextActiveSeat(nextTable, player.seatIndex),
  })
}

function recordCheck(table: TableState, player: PlayerState): TableState {
  if (amountToCall(table, player) > 0) {
    return recordCall(table, player)
  }

  const checkedSeatIndexes = Array.from(
    new Set([...table.checkedSeatIndexes, player.seatIndex]),
  )
  const players = table.players.map((candidate) =>
    candidate.id === player.id
      ? { ...candidate, lastAction: 'Check', actionAmount: undefined }
      : candidate,
  )
  const actionLog = [...table.actionLog, `${player.name} checks`]

  if (isBettingRoundComplete({ ...table, players, checkedSeatIndexes })) {
    return advanceStreet({
      ...table,
      players,
      checkedSeatIndexes,
      actionLog,
    })
  }

  return setActivePlayer({
    ...table,
    players,
    checkedSeatIndexes,
    actionLog,
    activeSeatIndex: nextActiveSeat(table, player.seatIndex),
  })
}

function recordCall(table: TableState, player: PlayerState): TableState {
  const toCall = amountToCall(table, player)
  const amount = Math.min(toCall, player.chips)
  const players = commitChips(table.players, player.id, amount).map((candidate) => {
    if (candidate.id !== player.id) return candidate
    const { lastAction, actionAmount } = actionLabelAfterCommit(
      candidate,
      'Call',
      amount,
    )
    return { ...candidate, lastAction, actionAmount }
  })
  const nextTable = {
    ...table,
    players,
    checkedSeatIndexes: Array.from(
      new Set([...table.checkedSeatIndexes, player.seatIndex]),
    ),
    actionLog: [...table.actionLog, `${player.name} calls ${amount}`],
  }

  if (isBettingRoundComplete(nextTable)) {
    return advanceStreet(nextTable)
  }

  return setActivePlayer({
    ...nextTable,
    activeSeatIndex: nextActiveSeat(nextTable, player.seatIndex),
  })
}

function recordBetOrRaise(
  table: TableState,
  player: PlayerState,
  requestedTargetBet: number,
): TableState {
  const minimumTarget = getMinimumTargetBet(table, player)
  const maxTarget = player.bet + player.chips
  const targetBet = clamp(
    Math.floor(requestedTargetBet),
    minimumTarget,
    maxTarget,
  )
  const amount = targetBet - player.bet
  if (amount <= 0) return table

  const raiseSize = Math.max(table.minRaise, targetBet - table.currentBet)
  const players = commitChips(table.players, player.id, amount)
  const verb = table.currentBet === 0 ? 'bets' : 'raises to'
  const action = table.currentBet === 0 ? 'Bet' : 'Raise'
  const nextTable = {
    ...table,
    players: players.map((candidate) => {
      if (candidate.id !== player.id) return candidate
      const { lastAction, actionAmount } = actionLabelAfterCommit(
        candidate,
        action,
        targetBet,
      )
      return { ...candidate, lastAction, actionAmount }
    }),
    currentBet: targetBet,
    minRaise: raiseSize,
    checkedSeatIndexes: [player.seatIndex],
    actionLog: [...table.actionLog, `${player.name} ${verb} ${targetBet}`],
    message: `${player.name} ${verb} ${targetBet}`,
  }

  if (isBettingRoundComplete(nextTable)) {
    return advanceStreet(nextTable)
  }

  return setActivePlayer({
    ...nextTable,
    activeSeatIndex: nextActiveSeat(nextTable, player.seatIndex),
  })
}

function advanceStreet(table: TableState): TableState {
  if (table.phase === 'river') {
    return resolveShowdown(table)
  }

  const nextPhase = nextPhaseAfter(table.phase)
  const nextDeck = [...table.deck]
  const communityCards = [...table.communityCards]
  const collectedPot = collectCurrentBets(table)

  if (nextPhase !== 'showdown') {
    nextDeck.shift()
    communityCards.push(...nextDeck.splice(0, STREET_CARDS[nextPhase]))
  }

  return setActivePlayer({
    ...table,
    phase: nextPhase,
    pot: collectedPot,
    deck: nextDeck,
    communityCards,
    players: table.players.map((player) => ({
      ...player,
      bet: 0,
      lastAction: player.lastAction === 'Fold' ? 'Fold' : undefined,
      actionAmount: player.lastAction === 'Fold' ? player.actionAmount : undefined,
    })),
    currentBet: 0,
    minRaise: table.config.bigBlind,
    checkedSeatIndexes: [],
    activeSeatIndex: findFirstActionableSeat(
      table.players,
      getFirstActionSeatIndexForPhase(
        nextPhase,
        table.dealerSeatIndex,
        table.players.length,
      ),
    ),
    message: '',
  })
}

function resolveShowdown(table: TableState): TableState {
  const collectedPot = collectCurrentBets(table)
  const results = activePlayers(table).map((player) => ({
    player,
    result: evaluateBestHand([...player.holeCards, ...table.communityCards]),
  }))

  const best = results.reduce((winner, current) =>
    compareScores(current.result.score, winner.result.score) > 0
      ? current
      : winner,
  )
  const payouts = distributeSidePots(table.players, results, table.dealerSeatIndex)
  const winnerIds = [...payouts.keys()]
  const winnerNames = table.players
    .filter((player) => winnerIds.includes(player.id))
    .map((player) => player.name)
    .join(', ')
  const paidPlayers = applyPayouts(table.players, payouts)

  return {
    ...setActivePlayer({
      ...table,
      pot: collectedPot,
      players: paidPlayers.map((player) => ({ ...player, bet: 0 })),
      phase: 'showdown',
      currentBet: 0,
      activeSeatIndex: null,
      checkedSeatIndexes: [],
      winnerIds,
      winningHandLabel: best.result.label,
    }),
    message: `${winnerNames} wins with ${best.result.label}`,
  }
}

export function evaluateBestHand(cards: Card[]): HandResult {
  const values = cards
    .map((card) => RANK_VALUE[card.rank])
    .sort((a, b) => b - a)
  const uniqueValues = uniqueDesc(values)
  const valueCounts = countValues(values)
  const groups = [...valueCounts.entries()].sort(
    ([valueA, countA], [valueB, countB]) => countB - countA || valueB - valueA,
  )
  const cardsBySuit = groupCardsBySuit(cards)
  const flushCards = Object.values(cardsBySuit).find(
    (suitedCards) => suitedCards.length >= 5,
  )
  const straightHigh = findStraightHigh(uniqueValues)
  const straightFlushHigh = flushCards
    ? findStraightHigh(
        uniqueDesc(flushCards.map((card) => RANK_VALUE[card.rank])),
      )
    : null

  if (straightFlushHigh) {
    return {
      label: straightFlushHigh === 14 ? 'Royal Flush' : 'Straight Flush',
      score: [8, straightFlushHigh],
    }
  }

  const four = groups.find(([, count]) => count === 4)
  if (four) {
    return {
      label: 'Four of a Kind',
      score: [7, four[0], ...topValues(uniqueValues, 1, [four[0]])],
    }
  }

  const trips = groups
    .filter(([, count]) => count === 3)
    .map(([value]) => value)
    .sort((a, b) => b - a)
  const pairs = groups
    .filter(([, count]) => count === 2)
    .map(([value]) => value)
    .sort((a, b) => b - a)
  if (trips.length > 0 && (pairs.length > 0 || trips.length > 1)) {
    const trip = trips[0]
    const pair = trips[1] ?? pairs[0]
    return { label: 'Full House', score: [6, trip, pair] }
  }

  if (flushCards) {
    return {
      label: 'Flush',
      score: [
        5,
        ...uniqueDesc(flushCards.map((card) => RANK_VALUE[card.rank])).slice(0, 5),
      ],
    }
  }

  if (straightHigh) {
    return { label: 'Straight', score: [4, straightHigh] }
  }

  if (trips.length > 0) {
    return {
      label: 'Three of a Kind',
      score: [3, trips[0], ...topValues(uniqueValues, 2, [trips[0]])],
    }
  }

  if (pairs.length >= 2) {
    const [highPair, lowPair] = pairs
    return {
      label: 'Two Pair',
      score: [
        2,
        highPair,
        lowPair,
        ...topValues(uniqueValues, 1, [highPair, lowPair]),
      ],
    }
  }

  if (pairs.length === 1) {
    return {
      label: 'One Pair',
      score: [1, pairs[0], ...topValues(uniqueValues, 3, [pairs[0]])],
    }
  }

  return { label: 'High Card', score: [0, ...uniqueValues.slice(0, 5)] }
}

function createPlayers(
  count: number,
  dealerSeatIndex: number,
  config: GameConfig,
): PlayerState[] {
  return Array.from({ length: count }, (_, seatIndex) => {
    const isHuman = seatIndex === 0
    const blind = getBlindForSeat(seatIndex, count, dealerSeatIndex)
    const position = getTablePositionForSeat(seatIndex, count, dealerSeatIndex)
    const bet = getBlindBet(blind, config)

    return {
      id: `player-${seatIndex}`,
      seatIndex,
      name: isHuman ? 'You' : AI_NAMES[seatIndex] ?? `Player ${seatIndex + 1}`,
      chips: config.startingChips - bet,
      bet,
      committed: bet,
      holeCards: [],
      isDealer: seatIndex === dealerSeatIndex,
      blind,
      position,
      isActive: false,
      hasFolded: false,
      isHuman,
      lastAction: getBlindActionLabel(blind),
      actionAmount: bet > 0 ? bet : undefined,
    }
  })
}

function resetPlayersForNextHand(
  previousPlayers: PlayerState[],
  dealerSeatIndex: number,
  config: GameConfig,
): PlayerState[] {
  const count = previousPlayers.length

  return previousPlayers.map((player) => {
    const blind = getBlindForSeat(player.seatIndex, count, dealerSeatIndex)
    const position = getTablePositionForSeat(
      player.seatIndex,
      count,
      dealerSeatIndex,
    )
    const blindAmount = Math.min(player.chips, getBlindBet(blind, config))
    return {
      ...player,
      chips: player.chips - blindAmount,
      bet: blindAmount,
      committed: blindAmount,
      holeCards: [],
      isDealer: player.seatIndex === dealerSeatIndex,
      blind,
      position,
      isActive: false,
      hasFolded: player.chips <= 0,
      lastAction:
        blindAmount > 0 ? getBlindActionLabel(blind) : undefined,
      actionAmount: blindAmount > 0 ? blindAmount : undefined,
      handDelta: undefined,
    }
  })
}

function reindexPlayersForNextHand(players: PlayerState[]) {
  return players
    .filter((player) => player.chips > 0)
    .map((player, seatIndex) => ({
      ...player,
      seatIndex,
    }))
}

function getNextDealerSeatIndex(
  previousPlayers: PlayerState[],
  remainingPlayers: PlayerState[],
  previousDealerSeatIndex: number,
) {
  if (remainingPlayers.length === 0) return 0

  for (let offset = 1; offset <= previousPlayers.length; offset += 1) {
    const nextSeatIndex =
      (previousDealerSeatIndex + offset) % previousPlayers.length
    const previousPlayer = previousPlayers.find(
      (player) => player.seatIndex === nextSeatIndex,
    )
    const remainingPlayer = remainingPlayers.find(
      (player) => player.id === previousPlayer?.id,
    )
    if (remainingPlayer) return remainingPlayer.seatIndex
  }

  return 0
}

function createDeck(): Card[] {
  return SUITS.flatMap((suit) =>
    RANKS.map((rank) => ({
      suit,
      rank,
      id: `${rank}-${suit}`,
    })),
  )
}

function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function dealHoleCards(
  players: PlayerState[],
  deck: Card[],
  firstSeatIndex: number,
) {
  for (let round = 0; round < 2; round += 1) {
    for (let offset = 0; offset < players.length; offset += 1) {
      const seatIndex = (firstSeatIndex + offset) % players.length
      const player = players.find((candidate) => candidate.seatIndex === seatIndex)
      const card = deck.shift()
      if (player && card) {
        player.holeCards.push({
          ...card,
          id: `${player.id}-${round}-${card.id}`,
        })
      }
    }
  }
}

function getBlindForSeat(
  seatIndex: number,
  playerCount: number,
  dealerSeatIndex: number,
): PlayerState['blind'] {
  const smallBlindSeat =
    playerCount === 2 ? dealerSeatIndex : nextSeat(dealerSeatIndex, playerCount)
  const bigBlindSeat = nextSeat(smallBlindSeat, playerCount)

  if (seatIndex === smallBlindSeat) return 'small'
  if (seatIndex === bigBlindSeat) return 'big'
  return undefined
}

function getTablePositionForSeat(
  seatIndex: number,
  playerCount: number,
  dealerSeatIndex: number,
): PlayerState['position'] {
  if (playerCount < 4 || seatIndex === dealerSeatIndex) return undefined

  const positionOffset = (seatIndex - dealerSeatIndex + playerCount) % playerCount

  if (playerCount >= 6) {
    if (positionOffset === 3) return 'UTG'
    if (positionOffset === 4) return 'HJ'
    if (positionOffset === 5) return 'CO'
  }

  if (playerCount === 5) {
    if (positionOffset === 3) return 'HJ'
    if (positionOffset === 4) return 'CO'
  }

  if (playerCount === 4 && positionOffset === 3) return 'CO'

  return undefined
}

function getBlindBet(blind: PlayerState['blind'], config: GameConfig) {
  if (blind === 'small') return config.smallBlind
  if (blind === 'big') return config.bigBlind
  return 0
}

function getBlindActionLabel(blind: PlayerState['blind']) {
  if (blind === 'big') return 'Big Blind'
  if (blind === 'small') return 'Small Blind'
  return undefined
}

function nextPhaseAfter(phase: GamePhase): GamePhase {
  if (phase === 'preflop') return 'flop'
  if (phase === 'flop') return 'turn'
  if (phase === 'turn') return 'river'
  return 'showdown'
}

function getFirstActionSeatIndexForPhase(
  phase: GamePhase,
  dealerSeatIndex: number,
  playerCount: number,
) {
  return phase === 'preflop'
    ? getPreflopFirstActionSeatIndex(dealerSeatIndex, playerCount)
    : getPostflopFirstActionSeatIndex(dealerSeatIndex, playerCount)
}

function getPreflopFirstActionSeatIndex(
  dealerSeatIndex: number,
  playerCount: number,
) {
  if (playerCount === 2) return dealerSeatIndex

  const bigBlindSeat = nextSeat(nextSeat(dealerSeatIndex, playerCount), playerCount)
  return nextSeat(bigBlindSeat, playerCount)
}

function getPostflopFirstActionSeatIndex(
  dealerSeatIndex: number,
  playerCount: number,
) {
  return nextSeat(dealerSeatIndex, playerCount)
}

function nextActiveSeat(table: TableState, currentSeatIndex: number) {
  const activeSeats = activePlayers(table)
    .filter(canAct)
    .map((player) => player.seatIndex)
  for (let offset = 1; offset <= table.players.length; offset += 1) {
    const next = (currentSeatIndex + offset) % table.players.length
    if (activeSeats.includes(next)) return next
  }
  return null
}

function setActivePlayer(table: TableState): TableState {
  const activeSeatIndex =
    table.phase === 'showdown' ? null : table.activeSeatIndex
  const activePlayer = table.players.find(
    (player) => player.seatIndex === activeSeatIndex,
  )

  return {
    ...table,
    activeSeatIndex,
    players: table.players.map((player) => ({
      ...player,
      isActive: player.seatIndex === activeSeatIndex,
    })),
    message:
      table.message ||
      (activeSeatIndex === null
        ? table.phase === 'showdown'
          ? 'Showdown'
          : 'All players all-in'
        : `${activePlayer?.name} to act`),
  }
}

function activePlayers(table: TableState) {
  return table.players.filter((player) => !player.hasFolded)
}

function canAct(player: PlayerState) {
  return !player.hasFolded && player.chips > 0
}

function findFirstActionableSeat(
  players: PlayerState[],
  preferredSeatIndex: number,
) {
  for (let offset = 0; offset < players.length; offset += 1) {
    const seatIndex = (preferredSeatIndex + offset) % players.length
    const player = players.find((candidate) => candidate.seatIndex === seatIndex)
    if (player && canAct(player)) return seatIndex
  }

  return null
}

function amountToCall(table: TableState, player: PlayerState) {
  return Math.max(0, table.currentBet - player.bet)
}

function collectCurrentBets(table: TableState) {
  return table.pot + table.players.reduce((sum, player) => sum + player.bet, 0)
}

function actionLabelAfterCommit(
  player: PlayerState,
  action: string,
  actionAmount?: number,
): Pick<PlayerState, 'lastAction' | 'actionAmount'> {
  if (player.chips === 0) {
    return { lastAction: 'All-in', actionAmount }
  }

  return { lastAction: action, actionAmount }
}

function shouldFastForwardToShowdown(table: TableState): boolean {
  if (table.players.length < 3) return false
  if (activePlayers(table).length < 2) return false

  const playersWithStack = table.players.filter((player) => player.chips > 0).length
  return playersWithStack <= 1
}

function fastForwardToShowdown(table: TableState): TableState {
  let current = table
  while (current.phase !== 'showdown') {
    current = advanceStreet(current)
  }
  return current
}

function maybeFastForwardToShowdown(table: TableState): TableState {
  return shouldFastForwardToShowdown(table)
    ? fastForwardToShowdown(table)
    : table
}

function commitChips(
  players: PlayerState[],
  playerId: string,
  amount: number,
) {
  return players.map((player) => {
    if (player.id !== playerId) return player

    const committed = Math.min(player.chips, Math.max(0, amount))
    return {
      ...player,
      chips: player.chips - committed,
      bet: player.bet + committed,
      committed: player.committed + committed,
    }
  })
}

function awardPotToWinners(
  players: PlayerState[],
  winnerIds: string[],
  pot: number,
  dealerSeatIndex: number,
) {
  if (winnerIds.length === 0 || pot <= 0) return players

  const orderedWinnerIds = orderPlayerIdsByOddChipPriority(
    players,
    winnerIds,
    dealerSeatIndex,
  )
  const share = Math.floor(pot / winnerIds.length)
  const remainder = pot % winnerIds.length

  return players.map((player) => {
    if (!winnerIds.includes(player.id)) {
      return { ...player, handDelta: undefined }
    }

    const extra = orderedWinnerIds.indexOf(player.id) === 0 ? remainder : 0
    const payout = share + extra
    return {
      ...player,
      chips: player.chips + payout,
      handDelta: payout,
    }
  })
}

function distributeSidePots(
  players: PlayerState[],
  results: { player: PlayerState; result: HandResult }[],
  dealerSeatIndex: number,
) {
  const payouts = new Map<string, number>()
  const sidePots = buildSidePots(players)

  sidePots.forEach((sidePot) => {
    const eligibleResults = results.filter(({ player }) =>
      sidePot.eligibleIds.includes(player.id),
    )
    if (eligibleResults.length === 0) return

    const best = eligibleResults.reduce((winner, current) =>
      compareScores(current.result.score, winner.result.score) > 0
        ? current
        : winner,
    )
    const winners = eligibleResults.filter(
      ({ result }) => compareScores(result.score, best.result.score) === 0,
    )
    const orderedWinners = orderPlayersByOddChipPriority(
      winners.map(({ player }) => player),
      dealerSeatIndex,
      players.length,
    )
    const share = Math.floor(sidePot.amount / winners.length)
    const remainder = sidePot.amount % winners.length

    orderedWinners.forEach((player, index) => {
      const payout = share + (index === 0 ? remainder : 0)
      payouts.set(player.id, (payouts.get(player.id) ?? 0) + payout)
    })
  })

  return payouts
}

function buildSidePots(players: PlayerState[]): SidePot[] {
  const committedLevels = uniqueAsc(
    players
      .map((player) => player.committed)
      .filter((committed) => committed > 0),
  )
  const sidePots: SidePot[] = []
  let previousLevel = 0

  committedLevels.forEach((level) => {
    const contributors = players.filter((player) => player.committed >= level)
    const contribution = level - previousLevel
    const amount = contribution * contributors.length
    const eligibleIds = contributors
      .filter((player) => !player.hasFolded)
      .map((player) => player.id)

    if (amount > 0 && eligibleIds.length > 0) {
      sidePots.push({
        amount,
        contribution,
        contributorCount: contributors.length,
        eligibleIds,
      })
    }

    previousLevel = level
  })

  return sidePots
}

function applyPayouts(players: PlayerState[], payouts: Map<string, number>) {
  return players.map((player) => {
    const payout = payouts.get(player.id) ?? 0

    return {
      ...player,
      chips: player.chips + payout,
      handDelta: payout > 0 ? payout : undefined,
    }
  })
}

function orderPlayerIdsByOddChipPriority(
  players: PlayerState[],
  playerIds: string[],
  dealerSeatIndex: number,
) {
  return orderPlayersByOddChipPriority(
    players.filter((player) => playerIds.includes(player.id)),
    dealerSeatIndex,
    players.length,
  ).map((player) => player.id)
}

function orderPlayersByOddChipPriority(
  players: PlayerState[],
  dealerSeatIndex: number,
  playerCount: number,
) {
  return [...players].sort(
    (playerA, playerB) =>
      getOddChipPriority(playerA.seatIndex, dealerSeatIndex, playerCount) -
      getOddChipPriority(playerB.seatIndex, dealerSeatIndex, playerCount),
  )
}

function getOddChipPriority(
  seatIndex: number,
  dealerSeatIndex: number,
  playerCount: number,
) {
  const offset = (seatIndex - dealerSeatIndex + playerCount) % playerCount
  return offset === 0 ? playerCount : offset
}

function isBettingRoundComplete(table: TableState) {
  const remainingPlayers = activePlayers(table)
  if (remainingPlayers.length <= 1) return true
  if (!remainingPlayers.some(canAct)) return true

  return remainingPlayers.every(
    (player) =>
      player.chips === 0 ||
      (table.checkedSeatIndexes.includes(player.seatIndex) &&
        player.bet >= table.currentBet),
  )
}

function getMinimumTargetBet(table: TableState, player: PlayerState) {
  if (table.currentBet === 0) {
    return Math.min(player.bet + player.chips, table.config.bigBlind)
  }

  return Math.min(
    player.bet + player.chips,
    table.currentBet + table.minRaise,
  )
}

function shouldBotCall(table: TableState, player: PlayerState) {
  const toCall = amountToCall(table, player)
  if (toCall <= 0) return true
  if (toCall >= player.chips) return Math.random() < 0.35

  const pressure = toCall / Math.max(1, table.pot)
  const handStrength =
    table.phase === 'preflop'
      ? estimatePreflopStrength(player.holeCards)
      : evaluateBestHand([...player.holeCards, ...table.communityCards]).score[0] /
        8

  const callChance = clamp(0.25 + handStrength * 0.75 - pressure, 0.08, 0.92)
  return Math.random() < callChance
}

function decideBotAction(table: TableState, player: PlayerState): BotDecision {
  const toCall = amountToCall(table, player)
  const strength = estimateBotStrength(table, player)
  const potPressure = toCall / Math.max(1, table.pot)
  const stackPressure = toCall / Math.max(1, player.chips)
  const aggression = 0.08 + strength * 0.34

  if (toCall > 0) {
    const canRaise = player.chips > toCall + table.minRaise
    const raiseChance = clamp(
      strength * 0.42 - potPressure * 0.25 - stackPressure * 0.25,
      0,
      0.32,
    )

    if (canRaise && strength > 0.68 && Math.random() < raiseChance) {
      return {
        action: 'betOrRaise',
        targetBet: botRaiseTarget(table, player, strength),
      }
    }

    return shouldBotCall(table, player)
      ? { action: 'call' }
      : { action: 'fold' }
  }

  const canBet = player.chips >= table.config.bigBlind
  const bluffChance = table.phase === 'river' ? 0.03 : 0.06
  const betChance = clamp(aggression + bluffChance, 0.03, 0.42)

  if (canBet && Math.random() < betChance) {
    return {
      action: 'betOrRaise',
      targetBet: botOpenBetTarget(table, player, strength),
    }
  }

  return { action: 'check' }
}

function estimateBotStrength(table: TableState, player: PlayerState) {
  if (table.phase === 'preflop') {
    return estimatePreflopStrength(player.holeCards)
  }

  const madeHandStrength =
    evaluateBestHand([...player.holeCards, ...table.communityCards]).score[0] / 8
  const highCardStrength =
    Math.max(...player.holeCards.map((card) => RANK_VALUE[card.rank])) / 14
  const drawBonus = estimateDrawPotential([...player.holeCards, ...table.communityCards])

  return clamp(madeHandStrength * 0.72 + highCardStrength * 0.18 + drawBonus, 0, 1)
}

function botOpenBetTarget(
  table: TableState,
  player: PlayerState,
  strength: number,
) {
  const percent = strength > 0.75 ? 0.75 : strength > 0.55 ? 0.5 : 0.33
  const target = Math.max(table.config.bigBlind, Math.round(table.pot * percent))
  return Math.min(player.bet + player.chips, target)
}

function botRaiseTarget(
  table: TableState,
  player: PlayerState,
  strength: number,
) {
  const multiplier = strength > 0.82 ? 3 : 2
  const target = Math.max(
    table.currentBet + table.minRaise,
    Math.round(table.currentBet * multiplier),
  )
  return Math.min(player.bet + player.chips, target)
}

function estimateDrawPotential(cards: Card[]) {
  const bySuit = groupCardsBySuit(cards)
  const hasFlushDraw = Object.values(bySuit).some((suitedCards) => suitedCards.length >= 4)
  const values = uniqueDesc(cards.map((card) => RANK_VALUE[card.rank]))
  const normalized = values.includes(14) ? [...values, 1] : values
  const hasOpenEndedDraw = normalized.some((value) => {
    const run = [value, value - 1, value - 2, value - 3]
    return run.every((candidate) => normalized.includes(candidate))
  })

  return (hasFlushDraw ? 0.12 : 0) + (hasOpenEndedDraw ? 0.1 : 0)
}

function estimatePreflopStrength(cards: Card[]) {
  if (cards.length < 2) return 0

  const [a, b] = cards
  const high = Math.max(RANK_VALUE[a.rank], RANK_VALUE[b.rank])
  const low = Math.min(RANK_VALUE[a.rank], RANK_VALUE[b.rank])
  const isPair = a.rank === b.rank
  const isSuited = a.suit === b.suit
  const connected = Math.abs(RANK_VALUE[a.rank] - RANK_VALUE[b.rank]) <= 1

  let score = (high + low) / 28
  if (isPair) score += 0.35
  if (isSuited) score += 0.08
  if (connected) score += 0.06
  return clamp(score, 0, 1)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function clampPlayerCount(playerCount: number) {
  return Math.min(MAX_PLAYERS, Math.max(2, Math.floor(playerCount)))
}

function nextSeat(seatIndex: number, playerCount: number) {
  return (seatIndex + 1) % playerCount
}

function groupCardsBySuit(cards: Card[]): Record<Suit, Card[]> {
  return cards.reduce<Record<Suit, Card[]>>(
    (groups, card) => {
      groups[card.suit].push(card)
      return groups
    },
    { hearts: [], diamonds: [], clubs: [], spades: [] },
  )
}

function countValues(values: number[]) {
  return values.reduce<Map<number, number>>((counts, value) => {
    counts.set(value, (counts.get(value) ?? 0) + 1)
    return counts
  }, new Map())
}

function uniqueDesc(values: number[]) {
  return Array.from(new Set(values)).sort((a, b) => b - a)
}

function uniqueAsc(values: number[]) {
  return Array.from(new Set(values)).sort((a, b) => a - b)
}

function findStraightHigh(values: number[]) {
  const normalized = values.includes(14) ? [...values, 1] : values
  for (let i = 0; i <= normalized.length - 5; i += 1) {
    const window = normalized.slice(i, i + 5)
    if (window[0] - window[4] === 4) return window[0]
  }
  return null
}

function topValues(values: number[], count: number, exclude: number[] = []) {
  return values.filter((value) => !exclude.includes(value)).slice(0, count)
}

export function compareScores(a: number[], b: number[]) {
  const length = Math.max(a.length, b.length)
  for (let i = 0; i < length; i += 1) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}
