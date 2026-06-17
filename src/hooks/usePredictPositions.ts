import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  fetchPredictManagerPositionSummary,
  fetchPredictManagerRanges,
  fetchPredictOracles,
} from '../lib/predict-server/client';
import type { TradeQuote, TradeQuoteRequest } from '../lib/deepbook/quote';
import type {
  PredictOracle,
  PredictPositionStatus,
  PredictRangeMinted,
  PredictRangeRedeemed,
} from '../lib/predict-server/types';

type PositionKind = 'above' | 'below' | 'range';
const LOCAL_POSITION_TTL_MS = 5 * 60_000;

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
  settlementPrice: number | null;
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

type LocalPositionDisplayRow = PredictPositionDisplayRow & {
  localCreatedAt: number;
};

export interface PredictPositionsOverview {
  isPartial: boolean;
  rows: PredictPositionDisplayRow[];
  fetchedAt: number;
  warnings: PositionDataWarning[];
}

type PositionDataWarning = 'directional' | 'ranges' | 'oracles';

export function usePredictPositions(managerId: string | null) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['predict-manager-positions', managerId],
    queryFn: async () => {
      if (!managerId) throw new Error('PredictManager id is required.');

      const [directionalResult, rangesResult, oraclesResult] = await Promise.allSettled([
        fetchPredictManagerPositionSummary(managerId),
        fetchPredictManagerRanges(managerId),
        fetchPredictOracles(),
      ]);
      const warnings: PositionDataWarning[] = [];

      if (directionalResult.status === 'rejected') warnings.push('directional');
      if (rangesResult.status === 'rejected') warnings.push('ranges');
      if (oraclesResult.status === 'rejected') warnings.push('oracles');

      if (directionalResult.status === 'rejected' && rangesResult.status === 'rejected') {
        throw new Error('Predict Server position endpoints unavailable.');
      }

      const directionalSummaries =
        directionalResult.status === 'fulfilled' ? directionalResult.value : [];
      const ranges =
        rangesResult.status === 'fulfilled' ? rangesResult.value : { minted: [], redeemed: [] };
      const oracles = oraclesResult.status === 'fulfilled' ? oraclesResult.value : [];
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
          settlementPrice: oracleById.get(row.oracle_id)?.settlement_price ?? null,
          totalPayout: row.total_payout,
          realizedPnl: row.realized_pnl,
          markValue: row.mark_value,
          unrealizedPnl: row.unrealized_pnl,
          lastActivityAt: row.last_activity_at,
        }));
      const rangeRows = aggregateRangeRows(ranges.minted, ranges.redeemed, oracleById);
      const indexedRows = [...directionRows, ...rangeRows]
        .filter((row) => row.status !== 'redeemed')
        .sort(comparePositionRows);
      const localRows = getActiveLocalRows(queryClient, managerId, indexedRows);
      const rows = mergeIndexedAndLocalRows(indexedRows, localRows).sort(comparePositionRows);

      return {
        isPartial: warnings.length > 0,
        rows,
        fetchedAt: Date.now(),
        warnings,
      } satisfies PredictPositionsOverview;
    },
    enabled: Boolean(managerId),
    refetchInterval: managerId ? 5_000 : false,
    staleTime: 2_000,
  });
}

export function addLocalMintedPosition({
  managerId,
  queryClient,
  quote,
  request,
}: {
  managerId: string;
  queryClient: QueryClient;
  quote: TradeQuote;
  request: TradeQuoteRequest;
}) {
  const now = Date.now();
  const id = getPositionId(request);
  const localKey = getLocalPositionsQueryKey(managerId);
  const localRows = queryClient.getQueryData<LocalPositionDisplayRow[]>(localKey) ?? [];
  const displayedRows =
    queryClient.getQueryData<PredictPositionsOverview>(['predict-manager-positions', managerId])
      ?.rows ?? [];
  const baseRow =
    localRows.find((row) => row.id === id) ?? displayedRows.find((row) => row.id === id);
  const nextRow = baseRow
    ? mergeMintIntoPositionRow(baseRow, request, quote, now)
    : createLocalPositionRow(request, quote, now);
  const nextLocalRows = [...localRows.filter((row) => row.id !== id), nextRow];

  queryClient.setQueryData(localKey, nextLocalRows);
  queryClient.setQueryData<PredictPositionsOverview>(
    ['predict-manager-positions', managerId],
    (current) => {
      const currentRows = current?.rows ?? [];
      const mergedRows = mergeIndexedAndLocalRows(currentRows, nextLocalRows).sort(comparePositionRows);

      return {
        fetchedAt: current?.fetchedAt ?? now,
        isPartial: current?.isPartial ?? false,
        rows: mergedRows,
        warnings: current?.warnings ?? [],
      };
    },
  );
}

export function removeLocalMintedPosition({
  managerId,
  positionId,
  queryClient,
}: {
  managerId: string | null;
  positionId: string;
  queryClient: QueryClient;
}) {
  if (!managerId) return;

  const localKey = getLocalPositionsQueryKey(managerId);
  const localRows = queryClient.getQueryData<LocalPositionDisplayRow[]>(localKey) ?? [];
  queryClient.setQueryData(
    localKey,
    localRows.filter((row) => row.id !== positionId),
  );
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
    const oracle = oracleById.get(aggregate.oracleId);
    const openQuantity = Math.max(0, aggregate.mintedQuantity - aggregate.redeemedQuantity);
    const closedCostBasis =
      aggregate.mintedQuantity > 0
        ? (aggregate.totalCost * aggregate.redeemedQuantity) / aggregate.mintedQuantity
        : 0;

    return {
      id: aggregate.id,
      kind: 'range',
      status: getRangeStatus(aggregate, openQuantity, oracle),
      oracleId: aggregate.oracleId,
      expiry: aggregate.expiry,
      lowerStrike: aggregate.lowerStrike,
      higherStrike: aggregate.higherStrike,
      mintedQuantity: aggregate.mintedQuantity,
      redeemedQuantity: aggregate.redeemedQuantity,
      openQuantity,
      costBasis: aggregate.totalCost - closedCostBasis,
      settlementPrice: oracle?.settlement_price ?? null,
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
      settlementPrice > aggregate.lowerStrike &&
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

function getLocalPositionsQueryKey(managerId: string) {
  return ['predict-local-minted-positions', managerId] as const;
}

function getActiveLocalRows(
  queryClient: QueryClient,
  managerId: string,
  indexedRows: PredictPositionDisplayRow[],
) {
  const localKey = getLocalPositionsQueryKey(managerId);
  const localRows = queryClient.getQueryData<LocalPositionDisplayRow[]>(localKey) ?? [];
  const now = Date.now();
  const activeRows = localRows.filter((row) => shouldKeepLocalRow(row, indexedRows, now));

  if (activeRows.length !== localRows.length) {
    queryClient.setQueryData(localKey, activeRows);
  }

  return activeRows;
}

function shouldKeepLocalRow(
  localRow: LocalPositionDisplayRow,
  indexedRows: PredictPositionDisplayRow[],
  now: number,
) {
  if (now - localRow.localCreatedAt > LOCAL_POSITION_TTL_MS) return false;

  const indexedRow = indexedRows.find((row) => row.id === localRow.id);
  if (!indexedRow) return true;

  return (
    indexedRow.mintedQuantity < localRow.mintedQuantity ||
    indexedRow.openQuantity < localRow.openQuantity
  );
}

function mergeIndexedAndLocalRows(
  indexedRows: PredictPositionDisplayRow[],
  localRows: LocalPositionDisplayRow[],
) {
  const rowById = new Map(indexedRows.map((row) => [row.id, row]));

  for (const localRow of localRows) {
    const indexedRow = rowById.get(localRow.id);
    if (
      !indexedRow ||
      indexedRow.mintedQuantity < localRow.mintedQuantity ||
      indexedRow.openQuantity < localRow.openQuantity
    ) {
      rowById.set(localRow.id, localRow);
    }
  }

  return Array.from(rowById.values());
}

function getPositionId(request: TradeQuoteRequest) {
  if (request.kind === 'range') {
    return [
      'range',
      request.oracleId,
      request.expiry.toString(),
      request.lowerStrike.toString(),
      request.higherStrike.toString(),
    ].join(':');
  }

  return [
    'directional',
    request.oracleId,
    request.expiry.toString(),
    request.strike.toString(),
    request.kind === 'above' ? 'up' : 'down',
  ].join(':');
}

function createLocalPositionRow(
  request: TradeQuoteRequest,
  quote: TradeQuote,
  now: number,
): LocalPositionDisplayRow {
  const common = {
    id: getPositionId(request),
    status: getLocalStatus(request.expiry, now),
    oracleId: request.oracleId,
    expiry: Number(request.expiry),
    mintedQuantity: Number(request.quantity),
    redeemedQuantity: 0,
    openQuantity: Number(request.quantity),
    costBasis: Number(quote.cost),
    settlementPrice: null,
    totalPayout: 0,
    realizedPnl: 0,
    lastActivityAt: now,
    localCreatedAt: now,
  };

  if (request.kind === 'range') {
    return {
      ...common,
      kind: 'range',
      lowerStrike: Number(request.lowerStrike),
      higherStrike: Number(request.higherStrike),
    };
  }

  return {
    ...common,
    kind: request.kind,
    strike: Number(request.strike),
    markValue: Number(quote.liveRedeem),
    unrealizedPnl: Number(quote.liveRedeem) - Number(quote.cost),
  };
}

function mergeMintIntoPositionRow(
  row: PredictPositionDisplayRow,
  request: TradeQuoteRequest,
  quote: TradeQuote,
  now: number,
): LocalPositionDisplayRow {
  if (row.kind !== request.kind) {
    return createLocalPositionRow(request, quote, now);
  }

  const mintedQuantity = row.mintedQuantity + Number(request.quantity);
  const openQuantity = row.openQuantity + Number(request.quantity);
  const costBasis = row.costBasis + Number(quote.cost);
  const status = getLocalStatus(request.expiry, now);

  if (row.kind === 'range') {
    return {
      ...row,
      status,
      mintedQuantity,
      openQuantity,
      costBasis,
      lastActivityAt: now,
      localCreatedAt: now,
    };
  }

  const markValue = (row.markValue ?? 0) + Number(quote.liveRedeem);

  return {
    ...row,
    status,
    mintedQuantity,
    openQuantity,
    costBasis,
    lastActivityAt: now,
    localCreatedAt: now,
    markValue,
    unrealizedPnl: markValue - costBasis,
  };
}

function getLocalStatus(expiry: bigint, now: number): PredictPositionStatus {
  return now >= Number(expiry) ? 'awaiting_settlement' : 'active';
}
