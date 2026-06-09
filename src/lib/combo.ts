import type { PredictPositionDisplayRow } from '../hooks/usePredictPositions';
import type { TradeQuote, TradeQuoteRequest } from './deepbook/quote';

export const COMBO_LEG_TARGET = 3;

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
  strike?: string;
}

export interface ArenaComboSlip {
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

export function getComboLegOdds(leg: ArenaComboLeg) {
  const cost = Number(BigInt(leg.cost));
  const maxPayout = Number(BigInt(leg.maxPayout));

  if (!Number.isFinite(cost) || cost <= 0) return null;
  return maxPayout / cost;
}

export function getComboMultiplier(legs: ArenaComboLeg[]) {
  if (legs.length === 0) return null;

  return legs.reduce<number | null>((multiplier, leg) => {
    const odds = getComboLegOdds(leg);
    if (multiplier == null || odds == null) return null;
    return multiplier * odds;
  }, 1);
}

export function getComboTotalCost(legs: ArenaComboLeg[]) {
  return legs.reduce((total, leg) => total + BigInt(leg.cost), 0n);
}

export function findMatchingPosition(
  leg: ArenaComboLeg,
  rows: PredictPositionDisplayRow[],
) {
  return rows.find((row) => {
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
  }) ?? null;
}

function createId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
