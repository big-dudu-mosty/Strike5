import { ArrowDown, ArrowUp, Layers, ScanLine } from 'lucide-react';
import { usePredictPositions, type PredictPositionDisplayRow } from '../../hooks/usePredictPositions';
import {
  formatDUsdc,
  formatTime,
  formatUsd,
  scaleOracleUsd,
  scaleQuoteAsset,
} from '../../lib/formatters';
import { useI18n } from '../../lib/i18n/I18nProvider';
import type { MessageKey } from '../../lib/i18n/types';

interface PositionsPanelProps {
  managerId: string | null;
}

export function PositionsPanel({ managerId }: PositionsPanelProps) {
  const { t } = useI18n();
  const positions = usePredictPositions(managerId);
  const rows = positions.data?.rows ?? [];

  return (
    <section className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{t('positions.title')}</h2>
          <p className="text-sm text-zinc-500">{t('positions.subtitle')}</p>
        </div>
        <Layers className="h-5 w-5 text-emerald-300" aria-hidden="true" />
      </div>

      {!managerId ? (
        <EmptyPositions message={t('positions.noManager')} />
      ) : positions.isLoading ? (
        <EmptyPositions message={t('positions.loading')} />
      ) : positions.error ? (
        <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {t('positions.error')}
        </div>
      ) : rows.length === 0 ? (
        <EmptyPositions message={t('positions.empty')} />
      ) : (
        <div className="mt-4 grid gap-3">
          {rows.map((row) => (
            <PositionCard key={row.id} row={row} />
          ))}
        </div>
      )}
    </section>
  );
}

function PositionCard({ row }: { row: PredictPositionDisplayRow }) {
  const { t } = useI18n();
  const Icon = row.kind === 'above' ? ArrowUp : row.kind === 'below' ? ArrowDown : ScanLine;
  const titleKey = getPositionTitleKey(row.kind);
  const markOrPayout = getMarkOrPayout(row);
  const pnl = getPositionPnl(row, markOrPayout);

  return (
    <article className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-emerald-300">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-zinc-100">{t(titleKey)}</h3>
            <p className="mt-0.5 truncate text-sm text-zinc-500">{formatInstrument(row)}</p>
          </div>
        </div>
        <StatusBadge status={row.status} />
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label={t('positions.openSize')}
          value={formatDUsdc(scaleQuoteAsset(row.openQuantity))}
        />
        <Metric
          label={t('positions.costBasis')}
          value={formatDUsdc(scaleQuoteAsset(row.costBasis))}
        />
        <Metric
          label={t('positions.markOrPayout')}
          value={formatDUsdc(scaleQuoteAsset(markOrPayout))}
        />
        <Metric label={t('positions.pnl')} value={formatDUsdc(scaleQuoteAsset(pnl))} />
        <Metric label={t('positions.expiry')} value={formatTime(row.expiry)} />
        <Metric label={t('positions.updated')} value={formatTime(row.lastActivityAt)} />
        <Metric
          label={t('positions.minted')}
          value={formatDUsdc(scaleQuoteAsset(row.mintedQuantity))}
        />
        <Metric
          label={t('positions.redeemed')}
          value={formatDUsdc(scaleQuoteAsset(row.redeemedQuantity))}
        />
      </dl>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-zinc-500">{label}</dt>
      <dd className="mt-1 truncate font-medium text-zinc-100">{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const colorClass = getStatusColorClass(status);

  return (
    <span className={`shrink-0 rounded-md border px-2 py-1 text-xs font-medium ${colorClass}`}>
      {getStatusLabel(status, t)}
    </span>
  );
}

function EmptyPositions({ message }: { message: string }) {
  return (
    <div className="mt-4 rounded-md border border-dashed border-zinc-700 p-6 text-center text-sm text-zinc-500">
      {message}
    </div>
  );
}

function formatInstrument(row: PredictPositionDisplayRow) {
  if (row.kind === 'range') {
    return `${formatUsd(scaleOracleUsd(row.lowerStrike), { integer: true })} - ${formatUsd(
      scaleOracleUsd(row.higherStrike),
      { integer: true },
    )}`;
  }

  return formatUsd(scaleOracleUsd(row.strike), { integer: true });
}

function getMarkOrPayout(row: PredictPositionDisplayRow) {
  if (row.kind !== 'range') return row.markValue ?? row.totalPayout;
  if (row.status === 'redeemable') return row.openQuantity;
  if (row.status === 'lost') return 0;
  return null;
}

function getPositionPnl(row: PredictPositionDisplayRow, markOrPayout: number | null) {
  if (row.openQuantity <= 0) return row.realizedPnl;
  if (markOrPayout == null) return null;
  return markOrPayout - row.costBasis;
}

function getPositionTitleKey(kind: PredictPositionDisplayRow['kind']): MessageKey {
  switch (kind) {
    case 'above':
      return 'trade.above';
    case 'below':
      return 'trade.below';
    case 'range':
      return 'trade.range';
  }
}

function getStatusLabel(status: string, t: (key: MessageKey) => string) {
  switch (status) {
    case 'active':
      return t('positions.status.active');
    case 'awaiting_settlement':
      return t('positions.status.awaitingSettlement');
    case 'redeemable':
      return t('positions.status.redeemable');
    case 'lost':
      return t('positions.status.lost');
    case 'redeemed':
      return t('positions.status.redeemed');
    default:
      return status;
  }
}

function getStatusColorClass(status: string) {
  switch (status) {
    case 'redeemable':
      return 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200';
    case 'awaiting_settlement':
      return 'border-amber-400/40 bg-amber-400/10 text-amber-200';
    case 'active':
      return 'border-sky-400/40 bg-sky-400/10 text-sky-200';
    case 'lost':
      return 'border-red-400/40 bg-red-400/10 text-red-200';
    default:
      return 'border-zinc-700 bg-zinc-800 text-zinc-300';
  }
}
