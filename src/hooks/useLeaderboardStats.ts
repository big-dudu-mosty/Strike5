import { useQuery } from '@tanstack/react-query';
import {
  fetchPredictManagerPositionSummary,
  fetchPredictManagerRanges,
  fetchPredictOracles,
} from '../lib/predict-server/client';
import type {
  PredictManagerPositionSummary,
  PredictOracle,
  PredictRangeMinted,
  PredictRangeRedeemed,
} from '../lib/predict-server/types';

const MIN_COMPLETED_ROUNDS = 5;

interface CompletedRoundResult {
  id: string;
  expiry: number;
  pnlRaw: number;
  won: boolean;
}

export interface LeaderboardStats {
  completedRounds: number;
  currentStreak: number;
  eligible: boolean;
  isPartial: boolean;
  losses: number;
  totalPnlRaw: number;
  winRate: number | null;
  wins: number;
  warnings: LeaderboardDataWarning[];
}

type LeaderboardDataWarning = 'directional' | 'ranges' | 'oracles';

export function useLeaderboardStats(managerId: string | null) {
  return useQuery({
    queryKey: ['arena-leaderboard-stats', managerId],
    queryFn: async () => {
      if (!managerId) throw new Error('PredictManager id is required.');

      const [directionalResult, rangesResult, oraclesResult] = await Promise.allSettled([
        fetchPredictManagerPositionSummary(managerId),
        fetchPredictManagerRanges(managerId),
        fetchPredictOracles(),
      ]);
      const warnings: LeaderboardDataWarning[] = [];

      if (directionalResult.status === 'rejected') warnings.push('directional');
      if (rangesResult.status === 'rejected') warnings.push('ranges');
      if (oraclesResult.status === 'rejected') warnings.push('oracles');

      const directionalRows =
        directionalResult.status === 'fulfilled' ? directionalResult.value : [];
      const ranges =
        rangesResult.status === 'fulfilled' ? rangesResult.value : { minted: [], redeemed: [] };
      const oracles = oraclesResult.status === 'fulfilled' ? oraclesResult.value : [];
      const oracleById = new Map(oracles.map((oracle) => [oracle.oracle_id, oracle]));
      const results = [
        ...buildDirectionalResults(directionalRows),
        ...buildRangeResults(ranges.minted, ranges.redeemed, oracleById),
      ].sort((a, b) => a.expiry - b.expiry || a.id.localeCompare(b.id));

      const wins = results.filter((result) => result.won).length;
      const completedRounds = results.length;
      const losses = completedRounds - wins;
      const totalPnlRaw = results.reduce((total, result) => total + result.pnlRaw, 0);

      return {
        completedRounds,
        currentStreak: calculateCurrentStreak(results),
        eligible: completedRounds >= MIN_COMPLETED_ROUNDS,
        isPartial: warnings.length > 0,
        losses,
        totalPnlRaw,
        winRate: completedRounds > 0 ? wins / completedRounds : null,
        wins,
        warnings,
      } satisfies LeaderboardStats;
    },
    enabled: Boolean(managerId),
    refetchInterval: managerId ? 10_000 : false,
    staleTime: 5_000,
  });
}

export { MIN_COMPLETED_ROUNDS };

function buildDirectionalResults(
  rows: PredictManagerPositionSummary[],
) {
  return rows.flatMap<CompletedRoundResult>((row) => {
    const status = normalizeStatus(row.status);
    if (!['redeemable', 'lost', 'redeemed'].includes(status)) return [];

    const won = status === 'redeemable' || (status === 'redeemed' && row.total_payout > 0);
    const estimatedPayout = status === 'redeemable'
      ? row.total_payout + row.open_quantity
      : row.total_payout;

    return [{
      id: ['directional', row.oracle_id, row.expiry, row.strike, row.is_up ? 'up' : 'down'].join(':'),
      expiry: row.expiry,
      pnlRaw: estimatedPayout - row.total_cost,
      won,
    }];
  });
}

interface RangeAggregate {
  expiry: number;
  higherStrike: number;
  id: string;
  lowerStrike: number;
  mintedQuantity: number;
  oracleId: string;
  redeemedQuantity: number;
  totalCost: number;
  totalPayout: number;
}

function buildRangeResults(
  minted: PredictRangeMinted[],
  redeemed: PredictRangeRedeemed[],
  oracleById: Map<string, PredictOracle>,
) {
  const aggregates = new Map<string, RangeAggregate>();

  for (const event of minted) {
    const aggregate = getOrCreateRangeAggregate(aggregates, event);
    aggregate.mintedQuantity += event.quantity;
    aggregate.totalCost += event.cost;
  }

  for (const event of redeemed) {
    const aggregate = getOrCreateRangeAggregate(aggregates, event);
    aggregate.redeemedQuantity += event.quantity;
    aggregate.totalPayout += event.payout;
  }

  return Array.from(aggregates.values()).flatMap<CompletedRoundResult>((aggregate) => {
    const oracle = oracleById.get(aggregate.oracleId);
    if (oracle?.status !== 'settled' || oracle.settlement_price == null) return [];

    const won =
      oracle.settlement_price > aggregate.lowerStrike &&
      oracle.settlement_price <= aggregate.higherStrike;
    const openQuantity = Math.max(0, aggregate.mintedQuantity - aggregate.redeemedQuantity);
    const estimatedPayout = aggregate.totalPayout + (won ? openQuantity : 0);

    return [{
      id: aggregate.id,
      expiry: aggregate.expiry,
      pnlRaw: estimatedPayout - aggregate.totalCost,
      won,
    }];
  });
}

function getOrCreateRangeAggregate(
  aggregates: Map<string, RangeAggregate>,
  event: {
    expiry: number;
    higher_strike: number;
    lower_strike: number;
    oracle_id: string;
  },
) {
  const id = ['range', event.oracle_id, event.expiry, event.lower_strike, event.higher_strike].join(':');
  const existing = aggregates.get(id);
  if (existing) return existing;

  const aggregate = {
    expiry: event.expiry,
    higherStrike: event.higher_strike,
    id,
    lowerStrike: event.lower_strike,
    mintedQuantity: 0,
    oracleId: event.oracle_id,
    redeemedQuantity: 0,
    totalCost: 0,
    totalPayout: 0,
  };
  aggregates.set(id, aggregate);
  return aggregate;
}

function calculateCurrentStreak(results: CompletedRoundResult[]) {
  let streak = 0;

  for (const result of [...results].reverse()) {
    if (!result.won) break;
    streak += 1;
  }

  return streak;
}

function normalizeStatus(status: string) {
  return status.toLowerCase();
}
