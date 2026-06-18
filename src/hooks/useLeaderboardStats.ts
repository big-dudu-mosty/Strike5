import { useQuery } from '@tanstack/react-query';
import {
  fetchOracleState,
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

interface RoundBuildResult {
  results: CompletedRoundResult[];
  unresolvedRounds: number;
}

export interface LeaderboardStats {
  completedRounds: number;
  currentStreak: number;
  eligible: boolean;
  isPartial: boolean;
  losses: number;
  totalPnlRaw: number;
  unresolvedRounds: number;
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
      const missingOracleWarning = await hydrateMissingReferencedOracles({
        directionalRows,
        oracleById,
        ranges,
      });

      if (missingOracleWarning && !warnings.includes('oracles')) {
        warnings.push('oracles');
      }

      const directionalBuild = buildDirectionalResults(directionalRows, oracleById);
      const rangeBuild = buildRangeResults(ranges.minted, ranges.redeemed, oracleById);
      const results = [
        ...directionalBuild.results,
        ...rangeBuild.results,
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
        unresolvedRounds: directionalBuild.unresolvedRounds + rangeBuild.unresolvedRounds,
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

async function hydrateMissingReferencedOracles({
  directionalRows,
  oracleById,
  ranges,
}: {
  directionalRows: PredictManagerPositionSummary[];
  oracleById: Map<string, PredictOracle>;
  ranges: {
    minted: PredictRangeMinted[];
    redeemed: PredictRangeRedeemed[];
  };
}) {
  const missingOracleIds = getMissingSettlementOracleIds({
    directionalRows,
    oracleById,
    ranges,
  });
  if (missingOracleIds.length === 0) return false;

  const oracleStateResults = await Promise.allSettled(
    missingOracleIds.map((oracleId) => fetchOracleState(oracleId)),
  );
  let hasWarning = false;

  for (const result of oracleStateResults) {
    if (result.status === 'fulfilled') {
      oracleById.set(result.value.oracle.oracle_id, result.value.oracle);
    } else {
      hasWarning = true;
    }
  }

  return hasWarning;
}

function getMissingSettlementOracleIds({
  directionalRows,
  oracleById,
  ranges,
}: {
  directionalRows: PredictManagerPositionSummary[];
  oracleById: Map<string, PredictOracle>;
  ranges: {
    minted: PredictRangeMinted[];
    redeemed: PredictRangeRedeemed[];
  };
}) {
  const now = Date.now();
  const oracleIds = new Set<string>();

  for (const row of directionalRows) {
    if (oracleById.has(row.oracle_id)) continue;
    if (needsSettlementOracle(row.expiry, row.status, now)) {
      oracleIds.add(row.oracle_id);
    }
  }

  for (const event of [...ranges.minted, ...ranges.redeemed]) {
    if (oracleById.has(event.oracle_id)) continue;
    if (event.expiry <= now) {
      oracleIds.add(event.oracle_id);
    }
  }

  return Array.from(oracleIds);
}

function needsSettlementOracle(expiry: number, status: string, now: number) {
  const normalized = normalizeStatus(status);
  if (isCompletedDirectionalStatus(normalized)) return false;

  return expiry <= now || normalized.includes('awaiting') || normalized.includes('pending');
}

function buildDirectionalResults(
  rows: PredictManagerPositionSummary[],
  oracleById: Map<string, PredictOracle>,
): RoundBuildResult {
  const results: CompletedRoundResult[] = [];
  let unresolvedRounds = 0;

  for (const row of rows) {
    const oracle = oracleById.get(row.oracle_id);
    const result =
      buildDirectionalOracleResult(row, oracle) ?? buildDirectionalStatusResult(row);

    if (result) {
      results.push(result);
    } else if (isUnresolvedDirectionalRound(row, oracle)) {
      unresolvedRounds += 1;
    }
  }

  return { results, unresolvedRounds };
}

function buildDirectionalOracleResult(
  row: PredictManagerPositionSummary,
  oracle: PredictOracle | undefined,
): CompletedRoundResult | null {
  if (oracle?.status !== 'settled' || oracle.settlement_price == null) return null;

  const won = row.is_up
    ? oracle.settlement_price > row.strike
    : oracle.settlement_price <= row.strike;
  const estimatedPayout = row.total_payout + (won ? row.open_quantity : 0);

  return {
    id: getDirectionalRoundId(row),
    expiry: row.expiry,
    pnlRaw: estimatedPayout - row.total_cost,
    won,
  };
}

function buildDirectionalStatusResult(
  row: PredictManagerPositionSummary,
): CompletedRoundResult | null {
  const status = normalizeStatus(row.status);
  if (!isCompletedDirectionalStatus(status)) return null;

  const won = isWinningDirectionalStatus(status, row);
  const estimatedPayout = isRedeemableDirectionalStatus(status)
    ? row.total_payout + row.open_quantity
    : row.total_payout;

  return {
    id: getDirectionalRoundId(row),
    expiry: row.expiry,
    pnlRaw: estimatedPayout - row.total_cost,
    won,
  };
}

function getDirectionalRoundId(row: PredictManagerPositionSummary) {
  return ['directional', row.oracle_id, row.expiry, row.strike, row.is_up ? 'up' : 'down'].join(':');
}

function isCompletedDirectionalStatus(status: string) {
  return (
    isRedeemableDirectionalStatus(status) ||
    status.includes('lost') ||
    status.includes('loss') ||
    status.includes('lose') ||
    status.includes('redeemed') ||
    status.includes('settled') ||
    status.includes('won') ||
    status.includes('win')
  );
}

function isRedeemableDirectionalStatus(status: string) {
  return status.includes('redeemable');
}

function isWinningDirectionalStatus(status: string, row: PredictManagerPositionSummary) {
  if (isRedeemableDirectionalStatus(status) || status.includes('won') || status.includes('win')) {
    return true;
  }

  if (status.includes('lost') || status.includes('loss') || status.includes('lose')) {
    return false;
  }

  return row.total_payout > 0 || row.realized_pnl > 0;
}

function isUnresolvedDirectionalRound(
  row: PredictManagerPositionSummary,
  oracle: PredictOracle | undefined,
) {
  const status = normalizeStatus(row.status);
  if (oracle?.status === 'settled' && oracle.settlement_price == null) return true;
  if (status.includes('awaiting') || status.includes('pending')) return true;

  return row.expiry <= Date.now();
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
): RoundBuildResult {
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

  const results: CompletedRoundResult[] = [];
  let unresolvedRounds = 0;

  for (const aggregate of aggregates.values()) {
    const oracle = oracleById.get(aggregate.oracleId);

    if (oracle?.status !== 'settled' || oracle.settlement_price == null) {
      if (aggregate.expiry <= Date.now()) unresolvedRounds += 1;
      continue;
    }

    const won =
      oracle.settlement_price > aggregate.lowerStrike &&
      oracle.settlement_price <= aggregate.higherStrike;
    const openQuantity = Math.max(0, aggregate.mintedQuantity - aggregate.redeemedQuantity);
    const estimatedPayout = aggregate.totalPayout + (won ? openQuantity : 0);

    results.push({
      id: aggregate.id,
      expiry: aggregate.expiry,
      pnlRaw: estimatedPayout - aggregate.totalCost,
      won,
    });
  }

  return { results, unresolvedRounds };
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
