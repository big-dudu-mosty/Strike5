import type { PredictPositionDisplayRow } from '../hooks/usePredictPositions';
import type { TradeQuote, TradeQuoteRequest } from './deepbook/quote';

export const STREAK_TARGET = 3;

export type StreakLegResult = 'won' | 'lost' | 'surrendered';

export interface ArenaComboLeg {
  cost: string;
  createdAt: number;
  expiry: string;
  higherStrike?: string;
  id: string;
  kind: TradeQuoteRequest['kind'];
  liveRedeem: string;
  lowerStrike?: string;
  maxPayout: string;
  oracleId: string;
  quantity: string;
  result?: StreakLegResult;
  strike?: string;
}

export interface ArenaStreak {
  createdAt: number;
  id: string;
  legs: ArenaComboLeg[];
  managerId: string;
}

export function createArenaComboLeg(
  request: TradeQuoteRequest,
  quote: TradeQuote,
): ArenaComboLeg {
  const base = {
    cost: quote.cost.toString(),
    createdAt: Date.now(),
    expiry: request.expiry.toString(),
    id: createId(),
    kind: request.kind,
    liveRedeem: quote.liveRedeem.toString(),
    maxPayout: quote.maxPayout.toString(),
    oracleId: request.oracleId,
    quantity: request.quantity.toString(),
  };

  if (request.kind === 'range') {
    return {
      ...base,
      higherStrike: request.higherStrike.toString(),
      lowerStrike: request.lowerStrike.toString(),
    };
  }

  return {
    ...base,
    strike: request.strike.toString(),
  };
}

export function getComboLegKey(leg: ArenaComboLeg) {
  return [
    leg.kind,
    leg.oracleId,
    leg.expiry,
    leg.strike ?? '',
    leg.lowerStrike ?? '',
    leg.higherStrike ?? '',
    leg.quantity,
  ].join(':');
}

export function getComboTotalCost(legs: ArenaComboLeg[]) {
  return legs.reduce((total, leg) => total + BigInt(leg.cost), 0n);
}

/**
 * Fixed-doubling streak multiplier: 1 win = 2x, 2 = 4x, 3 = 8x. 0 wins keeps 1x.
 */
export function getStreakMultiplier(hits: number) {
  if (hits <= 0) return 1;
  return 2 ** hits;
}

export type StreakAppendError = 'full' | 'order';

/**
 * A streak is busted once any leg has settled as a loss. A fresh leg added on a
 * terminal streak starts a brand-new streak, so appending is always allowed in
 * that case.
 */
export function getStreakAppendError(
  legs: ArenaComboLeg[],
  next: { expiry: bigint; oracleId: string },
): StreakAppendError | null {
  if (isStreakTerminal(legs)) return null;
  if (legs.length >= STREAK_TARGET) return 'full';

  const last = legs[legs.length - 1];
  if (!last) return null;

  if (next.oracleId === last.oracleId || next.expiry <= BigInt(last.expiry)) {
    return 'order';
  }

  return null;
}

export function isStreakBusted(legs: ArenaComboLeg[]) {
  return legs.some((leg) => leg.result === 'lost');
}

export function isStreakSurrendered(legs: ArenaComboLeg[]) {
  return legs.some((leg) => leg.result === 'surrendered');
}

export function isStreakCompleted(legs: ArenaComboLeg[]) {
  return legs.length === STREAK_TARGET && legs.every((leg) => leg.result === 'won');
}

export function isStreakTerminal(legs: ArenaComboLeg[]) {
  return isStreakBusted(legs) || isStreakSurrendered(legs) || isStreakCompleted(legs);
}

export type StreakLegStatus =
  | 'won'
  | 'lost'
  | 'surrendered'
  | 'awaiting'
  | 'active'
  | 'notMinted';

export interface StreakLegResolution {
  leg: ArenaComboLeg;
  row: PredictPositionDisplayRow | null;
  status: StreakLegStatus;
}

export interface StreakResolution {
  busted: boolean;
  canAdvance: boolean;
  completed: boolean;
  consecutiveWins: number;
  legs: StreakLegResolution[];
  litMultiplier: number;
  potentialMultiplier: number;
  surrendered: boolean;
}

export function resolveStreak(
  legs: ArenaComboLeg[],
  rows: PredictPositionDisplayRow[],
): StreakResolution {
  const legResolutions = legs.map<StreakLegResolution>((leg) => {
    const row = findMatchingPosition(leg, rows);
    return { leg, row, status: classifyLeg(leg, row) };
  });

  let consecutiveWins = 0;
  let busted = false;
  let surrendered = false;
  for (const item of legResolutions) {
    if (item.status === 'won') {
      consecutiveWins += 1;
      continue;
    }
    if (item.status === 'lost') {
      busted = true;
    }
    if (item.status === 'surrendered') {
      surrendered = true;
    }
    break;
  }

  const completed = legs.length === STREAK_TARGET && consecutiveWins === STREAK_TARGET;
  const allCurrentWon =
    legResolutions.length > 0 && legResolutions.every((item) => item.status === 'won');
  const canAdvance = allCurrentWon && legs.length < STREAK_TARGET;

  return {
    busted,
    canAdvance,
    completed,
    consecutiveWins,
    legs: legResolutions,
    // Surrender forfeits the streak: no multiplier is kept.
    litMultiplier: surrendered ? 1 : getStreakMultiplier(consecutiveWins),
    potentialMultiplier: getStreakMultiplier(STREAK_TARGET),
    surrendered,
  };
}

function classifyLeg(
  leg: ArenaComboLeg,
  row: PredictPositionDisplayRow | null,
): StreakLegStatus {
  // Persisted result wins so a redeemed (and thus filtered-out) position still
  // counts toward the streak.
  if (leg.result === 'won') return 'won';
  if (leg.result === 'lost') return 'lost';
  if (leg.result === 'surrendered') return 'surrendered';
  if (!row) return 'notMinted';

  switch (row.status) {
    case 'redeemable':
    case 'redeemed':
      return 'won';
    case 'lost':
      return 'lost';
    case 'awaiting_settlement':
      return hasEarlyExit(row) ? 'surrendered' : 'awaiting';
    default:
      return hasEarlyExit(row) ? 'surrendered' : 'active';
  }
}

/**
 * Any quantity redeemed while the position is still unsettled means the user
 * cashed out early, which forfeits the streak commitment.
 */
function hasEarlyExit(row: PredictPositionDisplayRow) {
  return row.redeemedQuantity > 0;
}

export function findMatchingPosition(
  leg: ArenaComboLeg,
  rows: PredictPositionDisplayRow[],
) {
  return rows.find((row) => legMatchesRow(leg, row)) ?? null;
}

export function findMatchingLeg(
  row: PredictPositionDisplayRow,
  legs: ArenaComboLeg[],
) {
  return legs.find((leg) => legMatchesRow(leg, row)) ?? null;
}

function legMatchesRow(leg: ArenaComboLeg, row: PredictPositionDisplayRow) {
  if (row.kind !== leg.kind) return false;
  if (row.oracleId !== leg.oracleId) return false;
  if (BigInt(row.expiry) !== BigInt(leg.expiry)) return false;

  if (row.kind === 'range') {
    return (
      BigInt(row.lowerStrike) === BigInt(leg.lowerStrike ?? -1) &&
      BigInt(row.higherStrike) === BigInt(leg.higherStrike ?? -1)
    );
  }

  return BigInt(row.strike) === BigInt(leg.strike ?? -1);
}

function createId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
