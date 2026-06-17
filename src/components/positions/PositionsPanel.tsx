import { ArrowDown, ArrowUp, CheckCircle2, Layers, ScanLine, Sparkles, XCircle } from 'lucide-react';
import { useState } from 'react';
import { usePositionRedeem } from '../../hooks/usePositionRedeem';
import { usePredictPositions, type PredictPositionDisplayRow } from '../../hooks/usePredictPositions';
import { useTradeQuote } from '../../hooks/useTradeQuote';
import type { TradeQuoteRequest } from '../../lib/deepbook/quote';
import {
  formatDUsdc,
  formatTime,
  formatUsd,
  scaleOracleUsd,
  scaleQuoteAsset,
} from '../../lib/formatters';
import { findMatchingLeg, type ArenaComboLeg } from '../../lib/combo';
import { useI18n } from '../../lib/i18n/I18nProvider';
import type { MessageKey } from '../../lib/i18n/types';
import { TransactionLink } from '../transaction/TransactionLink';

interface PositionsPanelProps {
  isExpectedNetwork: boolean;
  managerId: string | null;
  onStreakSurrender: (legId: string) => void;
  streakLegs: ArenaComboLeg[];
}

export function PositionsPanel({
  isExpectedNetwork,
  managerId,
  onStreakSurrender,
  streakLegs,
}: PositionsPanelProps) {
  const { t } = useI18n();
  const positions = usePredictPositions(managerId);
  const positionRedeem = usePositionRedeem({ managerId });
  const [redeemFeedbackPositionId, setRedeemFeedbackPositionId] = useState<string | null>(null);
  const [redeemingPositionId, setRedeemingPositionId] = useState<string | null>(null);
  const rows = positions.data?.rows ?? [];
  const revealRow = getLatestRevealRow(rows);
  const positionRows = revealRow ? rows.filter((row) => row.id !== revealRow.id) : rows;

  function handleRedeem(row: PredictPositionDisplayRow) {
    setRedeemFeedbackPositionId(row.id);
    setRedeemingPositionId(row.id);
    const wasUnsettledExit = row.status === 'active';
    void positionRedeem
      .mutateAsync(row)
      .then(() => {
        if (!wasUnsettledExit) return;
        const leg = findMatchingLeg(row, streakLegs);
        if (leg && !leg.result) {
          onStreakSurrender(leg.id);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        setRedeemingPositionId(null);
      });
  }

  function getPendingSurrenderLeg(row: PredictPositionDisplayRow) {
    if (row.status !== 'active') return null;
    const leg = findMatchingLeg(row, streakLegs);
    return leg && !leg.result ? leg : null;
  }

  return (
    <section className="terminal-panel rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-cream-100">
            {t('positions.title')}
          </h2>
          <p className="text-sm text-cream-600">{t('positions.subtitle')}</p>
        </div>
        <Layers className="h-5 w-5 text-brass-300" aria-hidden="true" />
      </div>

      {!managerId ? (
        <EmptyPositions message={t('positions.noManager')} />
      ) : positions.isLoading ? (
        <EmptyPositions message={t('positions.loading')} />
      ) : positions.error ? (
        <div className="mt-4 rounded-xl border border-clay-400/40 bg-clay-400/10 p-4 text-sm text-clay-200">
          {t('positions.error')}
        </div>
      ) : rows.length === 0 ? (
        <EmptyPositions message={t('positions.empty')} />
      ) : (
        <div className="mt-4 grid gap-3">
          {revealRow ? (
            <SettlementRevealPanel
              isExpectedNetwork={isExpectedNetwork}
              isRedeeming={redeemingPositionId === revealRow.id && positionRedeem.isPending}
              lastRedeemDigest={
                positionRedeem.data?.positionId === revealRow.id ? positionRedeem.data.digest : null
              }
              onRedeem={() => handleRedeem(revealRow)}
              redeemError={
                redeemFeedbackPositionId === revealRow.id
                  ? getRedeemErrorMessage(positionRedeem.error?.message, t)
                  : null
              }
              row={revealRow}
            />
          ) : null}
          {positionRows.map((row) => (
            <PositionCard
              isExpectedNetwork={isExpectedNetwork}
              isRedeeming={redeemingPositionId === row.id && positionRedeem.isPending}
              key={row.id}
              lastRedeemDigest={
                positionRedeem.data?.positionId === row.id ? positionRedeem.data.digest : null
              }
              onRedeem={() => handleRedeem(row)}
              redeemError={
                redeemFeedbackPositionId === row.id
                  ? getRedeemErrorMessage(positionRedeem.error?.message, t)
                  : null
              }
              requiresSurrenderConfirm={Boolean(getPendingSurrenderLeg(row))}
              row={row}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function SettlementRevealPanel({
  isExpectedNetwork,
  isRedeeming,
  lastRedeemDigest,
  onRedeem,
  redeemError,
  row,
}: {
  isExpectedNetwork: boolean;
  isRedeeming: boolean;
  lastRedeemDigest: string | null;
  onRedeem: () => void;
  redeemError: string | null;
  row: PredictPositionDisplayRow;
}) {
  const { t } = useI18n();
  const didWin = row.status === 'redeemable';
  const markOrPayout = getMarkOrPayout(row);
  const pnl = getPositionPnl(row, markOrPayout);
  const canRedeem = canRedeemPosition(row);
  const ResultIcon = didWin ? CheckCircle2 : XCircle;

  return (
    <article
      className={`rounded-xl border p-4 ${
        didWin
          ? 'border-moss-400/40 bg-moss-400/10'
          : 'border-clay-400/40 bg-clay-400/10'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              didWin ? 'bg-moss-400 text-ink-950' : 'bg-clay-400 text-ink-950'
            }`}
          >
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="text-xs font-medium uppercase tracking-normal text-cream-500">
              {t('positions.reveal.title')}
            </div>
            <h3 className="mt-1 text-base font-semibold text-cream-100">
              {didWin ? t('positions.reveal.winTitle') : t('positions.reveal.lossTitle')}
            </h3>
            <p className="mt-1 truncate text-sm text-cream-500">{formatInstrument(row)}</p>
          </div>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-xl px-2 py-1 text-xs font-semibold ${
            didWin ? 'bg-moss-400 text-ink-950' : 'bg-clay-400 text-ink-950'
          }`}
        >
          <ResultIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {didWin ? t('positions.reveal.win') : t('positions.reveal.loss')}
        </span>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <Metric
          label={t('positions.reveal.settlementPrice')}
          value={formatUsd(scaleOracleUsd(row.settlementPrice), { integer: true })}
        />
        <Metric
          label={t('positions.reveal.payout')}
          value={formatDUsdc(scaleQuoteAsset(markOrPayout))}
        />
        <Metric label={t('positions.pnl')} value={formatDUsdc(scaleQuoteAsset(pnl))} />
      </dl>

      {canRedeem ? (
        <div className="mt-4">
          <button
            className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-brass-400 px-3 text-sm font-semibold text-ink-950 transition hover:bg-brass-300 disabled:cursor-not-allowed disabled:bg-ink-800 disabled:text-cream-600"
            disabled={!isExpectedNetwork || isRedeeming}
            onClick={onRedeem}
            type="button"
          >
            {isRedeeming ? t('positions.redeeming') : getRedeemLabel(row, t)}
          </button>
          {lastRedeemDigest ? (
            <div className="mt-3 rounded-xl border border-moss-400/30 bg-moss-400/10 p-3 text-sm text-moss-200">
              <TransactionLink digest={lastRedeemDigest} label={t('positions.redeemSuccess')} />
            </div>
          ) : null}
          {redeemError ? (
            <div className="mt-3 rounded-xl border border-clay-400/40 bg-clay-400/10 p-3 text-sm text-clay-200">
              {redeemError}
            </div>
          ) : null}
          {!isExpectedNetwork ? (
            <div className="mt-2 text-xs text-amber-200">
              {t('positions.networkRequired')}
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function PositionCard({
  isExpectedNetwork,
  isRedeeming,
  lastRedeemDigest,
  onRedeem,
  redeemError,
  requiresSurrenderConfirm,
  row,
}: {
  isExpectedNetwork: boolean;
  isRedeeming: boolean;
  lastRedeemDigest: string | null;
  onRedeem: () => void;
  redeemError: string | null;
  requiresSurrenderConfirm: boolean;
  row: PredictPositionDisplayRow;
}) {
  const { t } = useI18n();
  const Icon = row.kind === 'above' ? ArrowUp : row.kind === 'below' ? ArrowDown : ScanLine;
  const titleKey = getPositionTitleKey(row.kind);
  const isActive = row.status === 'active';
  const liveQuote = useTradeQuote(isActive ? buildPositionQuoteRequest(row) : null);
  const liveExitRaw = liveQuote.data?.liveRedeem ?? null;
  const hasLive = isActive && liveExitRaw != null;
  const markOrPayout = hasLive ? Number(liveExitRaw) : getMarkOrPayout(row);
  const pnl = getPositionPnl(row, markOrPayout);
  const pnlTone = pnl == null ? undefined : pnl >= 0 ? 'up' : 'down';
  const canRedeem = canRedeemPosition(row);
  const canCashOut = isActive && row.openQuantity > 0;
  const redeemLabel = getRedeemLabel(row, t);

  function handleCashOut() {
    if (requiresSurrenderConfirm && !window.confirm(t('positions.cashOutStreakWarning'))) {
      return;
    }
    onRedeem();
  }

  return (
    <article className="soft-panel rounded-xl p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brass-400/10 text-brass-300">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-cream-100">{t(titleKey)}</h3>
            <p className="mt-0.5 truncate text-sm text-cream-600">{formatInstrument(row)}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {hasLive ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-brass-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brass-400" />
              {t('positions.live')}
            </span>
          ) : null}
          <StatusBadge status={row.status} />
        </div>
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
        <Metric label={t('positions.pnl')} tone={pnlTone} value={formatDUsdc(scaleQuoteAsset(pnl))} />
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

      {canCashOut ? (
        <div className="mt-4 border-t border-ink-700 pt-3">
          <button
            className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-brass-400 px-3 text-sm font-semibold text-ink-950 shadow-[0_12px_28px_rgba(34,211,238,0.18)] transition hover:bg-brass-300 disabled:cursor-not-allowed disabled:bg-ink-800 disabled:text-cream-600 disabled:shadow-none"
            disabled={!isExpectedNetwork || isRedeeming || !hasLive}
            onClick={handleCashOut}
            type="button"
          >
            {isRedeeming
              ? t('positions.cashingOut')
              : hasLive
                ? `${t('positions.cashOut')} ≈ ${formatDUsdc(scaleQuoteAsset(markOrPayout))}`
                : t('positions.cashOut')}
          </button>
          {requiresSurrenderConfirm ? (
            <div className="mt-2 text-xs text-amber-200">{t('positions.streakLegHint')}</div>
          ) : null}
          {liveQuote.isError ? (
            <div className="mt-2 text-xs text-amber-200">{t('positions.cashOutUnavailable')}</div>
          ) : null}
        </div>
      ) : null}

      {row.status === 'awaiting_settlement' ? (
        <div className="mt-4 rounded-xl border border-ink-600 bg-ink-900 p-3 text-xs text-cream-500">
          {t('positions.frozen')}
        </div>
      ) : null}

      {canRedeem ? (
        <div className="mt-4 border-t border-ink-700 pt-3">
          <button
            className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-brass-400 px-3 text-sm font-semibold text-ink-950 shadow-[0_12px_28px_rgba(34,211,238,0.18)] transition hover:bg-brass-300 disabled:cursor-not-allowed disabled:bg-ink-800 disabled:text-cream-600 disabled:shadow-none"
            disabled={!isExpectedNetwork || isRedeeming}
            onClick={onRedeem}
            type="button"
          >
            {isRedeeming ? t('positions.redeeming') : redeemLabel}
          </button>
        </div>
      ) : null}

      {canCashOut || canRedeem ? (
        <>
          {lastRedeemDigest ? (
            <div className="mt-3 rounded-xl border border-moss-400/30 bg-moss-400/10 p-3 text-sm text-moss-200">
              <TransactionLink digest={lastRedeemDigest} label={t('positions.redeemSuccess')} />
            </div>
          ) : null}
          {redeemError ? (
            <div className="mt-3 rounded-xl border border-clay-400/40 bg-clay-400/10 p-3 text-sm text-clay-200">
              {redeemError}
            </div>
          ) : null}
          {!isExpectedNetwork ? (
            <div className="mt-2 text-xs text-amber-200">
              {t('positions.networkRequired')}
            </div>
          ) : null}
        </>
      ) : null}
    </article>
  );
}

function Metric({
  label,
  tone,
  value,
}: {
  label: string;
  tone?: 'up' | 'down';
  value: string;
}) {
  const toneClass =
    tone === 'up' ? 'text-moss-300' : tone === 'down' ? 'text-clay-300' : 'text-cream-100';

  return (
    <div className="min-w-0">
      <dt className="truncate text-cream-600">{label}</dt>
      <dd className={`mt-1 truncate font-medium ${toneClass}`}>{value}</dd>
    </div>
  );
}

function buildPositionQuoteRequest(row: PredictPositionDisplayRow): TradeQuoteRequest | null {
  const quantity = BigInt(Math.max(0, Math.trunc(row.openQuantity)));
  if (quantity <= 0n) return null;

  const expiry = BigInt(row.expiry);

  if (row.kind === 'range') {
    return {
      kind: 'range',
      expiry,
      higherStrike: BigInt(Math.trunc(row.higherStrike)),
      lowerStrike: BigInt(Math.trunc(row.lowerStrike)),
      oracleId: row.oracleId,
      quantity,
    };
  }

  return {
    kind: row.kind,
    expiry,
    oracleId: row.oracleId,
    quantity,
    strike: BigInt(Math.trunc(row.strike)),
  };
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const colorClass = getStatusColorClass(status);

  return (
    <span className={`shrink-0 rounded-xl border px-2 py-1 text-xs font-medium ${colorClass}`}>
      {getStatusLabel(status, t)}
    </span>
  );
}

function EmptyPositions({ message }: { message: string }) {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-ink-600 p-6 text-center text-sm text-cream-600">
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

function canRedeemPosition(row: PredictPositionDisplayRow) {
  return row.openQuantity > 0 && (row.status === 'redeemable' || row.status === 'lost');
}

function getLatestRevealRow(rows: PredictPositionDisplayRow[]) {
  return rows
    .filter((row) => row.status === 'redeemable' || row.status === 'lost')
    .sort((a, b) => b.expiry - a.expiry || b.lastActivityAt - a.lastActivityAt)[0] ?? null;
}

function getRedeemLabel(row: PredictPositionDisplayRow, t: (key: MessageKey) => string) {
  return row.status === 'lost' ? t('positions.clearLost') : t('positions.redeem');
}

function getRedeemErrorMessage(message: string | null | undefined, t: (key: MessageKey) => string) {
  if (!message) return null;

  const normalized = message.toLowerCase();
  if (normalized.includes('incorrect password')) return t('positions.error.walletPassword');
  if (normalized.includes('reject') || normalized.includes('cancel')) {
    return t('positions.error.walletRejected');
  }

  return message;
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
      return 'border-moss-400/40 bg-moss-400/10 text-moss-200';
    case 'awaiting_settlement':
      return 'border-amber-400/40 bg-amber-400/10 text-amber-200';
    case 'active':
      return 'border-brass-400/40 bg-brass-400/10 text-brass-200';
    case 'lost':
      return 'border-clay-400/40 bg-clay-400/10 text-clay-200';
    default:
      return 'border-ink-600 bg-ink-800 text-cream-300';
  }
}
