import { useQuery } from '@tanstack/react-query';
import {
  fetchPredictManagerPositionSummary,
  fetchPredictManagerRanges,
  fetchPredictOracles,
} from '../lib/predict-server/client';
import type {
  PredictOracle,
  PredictPositionStatus,
  PredictRangeMinted,
  PredictRangeRedeemed,
} from '../lib/predict-server/types';

type PositionKind = 'above' | 'below' | 'range';

interface BasePositionDisplayRow {
  id: string;
  kind: PositionKind;
  status: PredictPositionStatus;
  oracleId: string;
  expiry: number;
  mintedQuantity: number;
  redeemedQuantity: number;
  openQuantity: number;
  costBasis: number;
  totalPayout: number;
  realizedPnl: number;
  lastActivityAt: number;
}

export interface DirectionalPositionDisplayRow extends BasePositionDisplayRow {
  kind: 'above' | 'below';
  strike: number;
  markValue: number | null;
  unrealizedPnl: number;
}

export interface RangePositionDisplayRow extends BasePositionDisplayRow {
  kind: 'range';
  lowerStrike: number;
  higherStrike: number;
}

export type PredictPositionDisplayRow =
  | DirectionalPositionDisplayRow
  | RangePositionDisplayRow;

export interface PredictPositionsOverview {
  rows: PredictPositionDisplayRow[];
  fetchedAt: number;
}

export function usePredictPositions(managerId: string | null) {
  return useQuery({
    queryKey: ['predict-manager-positions', managerId],
    queryFn: async () => {
      if (!managerId) throw new Error('PredictManager id is required.');

      const [directionalSummaries, ranges, oracles] = await Promise.all([
        fetchPredictManagerPositionSummary(managerId),
        fetchPredictManagerRanges(managerId),
        fetchPredictOracles(),
      ]);
      const oracleById = new Map(oracles.map((oracle) => [oracle.oracle_id, oracle]));
      const directionRows = directionalSummaries
        .filter((row) => row.status !== 'redeemed')
        .map<DirectionalPositionDisplayRow>((row) => ({
          id: [
            'directional',
            row.oracle_id,
            row.expiry,
            row.strike,
            row.is_up ? 'up' : 'down',
          ].join(':'),
          kind: row.is_up ? 'above' : 'below',
          status: row.status,
          oracleId: row.oracle_id,
          expiry: row.expiry,
          strike: row.strike,
          mintedQuantity: row.minted_quantity,
          redeemedQuantity: row.redeemed_quantity,
          openQuantity: row.open_quantity,
          costBasis: row.open_cost_basis,
          totalPayout: row.total_payout,
          realizedPnl: row.realized_pnl,
          markValue: row.mark_value,
          unrealizedPnl: row.unrealized_pnl,
          lastActivityAt: row.last_activity_at,
        }));
      const rangeRows = aggregateRangeRows(ranges.minted, ranges.redeemed, oracleById);
      const rows = [...directionRows, ...rangeRows]
        .filter((row) => row.status !== 'redeemed')
        .sort(comparePositionRows);

      return {
        rows,
        fetchedAt: Date.now(),
      } satisfies PredictPositionsOverview;
    },
    enabled: Boolean(managerId),
    refetchInterval: managerId ? 5_000 : false,
    staleTime: 2_000,
  });
}

interface MutableRangeAggregate {
  id: string;
  oracleId: string;
  expiry: number;
  lowerStrike: number;
  higherStrike: number;
  mintedQuantity: number;
  redeemedQuantity: number;
  totalCost: number;
  totalPayout: number;
  lastActivityAt: number;
}

function aggregateRangeRows(
  minted: PredictRangeMinted[],
  redeemed: PredictRangeRedeemed[],
  oracleById: Map<string, PredictOracle>,
) {
  const aggregates = new Map<string, MutableRangeAggregate>();

  for (const event of minted) {
    const aggregate = getOrCreateRangeAggregate(aggregates, event);
    aggregate.mintedQuantity += event.quantity;
    aggregate.totalCost += event.cost;
    aggregate.lastActivityAt = Math.max(aggregate.lastActivityAt, event.checkpoint_timestamp_ms);
  }

  for (const event of redeemed) {
    const aggregate = getOrCreateRangeAggregate(aggregates, event);
    aggregate.redeemedQuantity += event.quantity;
    aggregate.totalPayout += event.payout;
    aggregate.lastActivityAt = Math.max(aggregate.lastActivityAt, event.checkpoint_timestamp_ms);
  }

  return Array.from(aggregates.values()).map<RangePositionDisplayRow>((aggregate) => {
    const openQuantity = Math.max(0, aggregate.mintedQuantity - aggregate.redeemedQuantity);
    const closedCostBasis =
      aggregate.mintedQuantity > 0
        ? (aggregate.totalCost * aggregate.redeemedQuantity) / aggregate.mintedQuantity
        : 0;

    return {
      id: aggregate.id,
      kind: 'range',
      status: getRangeStatus(aggregate, openQuantity, oracleById.get(aggregate.oracleId)),
      oracleId: aggregate.oracleId,
      expiry: aggregate.expiry,
      lowerStrike: aggregate.lowerStrike,
      higherStrike: aggregate.higherStrike,
      mintedQuantity: aggregate.mintedQuantity,
      redeemedQuantity: aggregate.redeemedQuantity,
      openQuantity,
      costBasis: aggregate.totalCost - closedCostBasis,
      totalPayout: aggregate.totalPayout,
      realizedPnl: aggregate.totalPayout - closedCostBasis,
      lastActivityAt: aggregate.lastActivityAt,
    };
  });
}

function getOrCreateRangeAggregate(
  aggregates: Map<string, MutableRangeAggregate>,
  event: {
    oracle_id: string;
    expiry: number;
    lower_strike: number;
    higher_strike: number;
    checkpoint_timestamp_ms: number;
  },
) {
  const id = [
    'range',
    event.oracle_id,
    event.expiry,
    event.lower_strike,
    event.higher_strike,
  ].join(':');
  const existing = aggregates.get(id);
  if (existing) return existing;

  const aggregate = {
    id,
    oracleId: event.oracle_id,
    expiry: event.expiry,
    lowerStrike: event.lower_strike,
    higherStrike: event.higher_strike,
    mintedQuantity: 0,
    redeemedQuantity: 0,
    totalCost: 0,
    totalPayout: 0,
    lastActivityAt: event.checkpoint_timestamp_ms,
  };
  aggregates.set(id, aggregate);
  return aggregate;
}

function getRangeStatus(
  aggregate: MutableRangeAggregate,
  openQuantity: number,
  oracle: PredictOracle | undefined,
): PredictPositionStatus {
  if (openQuantity <= 0) return 'redeemed';

  if (oracle?.status === 'settled') {
    const settlementPrice = oracle.settlement_price;
    if (
      settlementPrice != null &&
      settlementPrice >= aggregate.lowerStrike &&
      settlementPrice <= aggregate.higherStrike
    ) {
      return 'redeemable';
    }

    return 'lost';
  }

  if (Date.now() >= aggregate.expiry) return 'awaiting_settlement';

  return 'active';
}

function comparePositionRows(a: PredictPositionDisplayRow, b: PredictPositionDisplayRow) {
  const rankDiff = getStatusRank(a.status) - getStatusRank(b.status);
  if (rankDiff !== 0) return rankDiff;

  const expiryDiff = a.expiry - b.expiry;
  if (expiryDiff !== 0) return expiryDiff;

  return a.id.localeCompare(b.id);
}

function getStatusRank(status: PredictPositionStatus) {
  switch (status) {
    case 'redeemable':
      return 0;
    case 'awaiting_settlement':
      return 1;
    case 'active':
      return 2;
    case 'lost':
      return 3;
    case 'redeemed':
      return 4;
    default:
      return 5;
  }
}
