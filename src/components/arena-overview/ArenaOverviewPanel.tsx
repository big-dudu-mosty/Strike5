import { Activity, Database, Flame, Zap } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import type { PredictAccountOverview } from '../../hooks/usePredictAccountOverview';
import {
  usePredictPositions,
  type PredictPositionDisplayRow,
} from '../../hooks/usePredictPositions';
import { useNow } from '../../hooks/useNow';
import {
  STREAK_TARGET,
  resolveStreak,
  type ArenaStreak,
  type StreakResolution,
} from '../../lib/combo';
import {
  formatDUsdc,
  formatFreshness,
  formatUsd,
  scaleOracleUsd,
  scaleQuoteAsset,
} from '../../lib/formatters';
import { useI18n } from '../../lib/i18n/I18nProvider';
import type { MessageKey } from '../../lib/i18n/types';
import type { PredictMarketOverview } from '../../lib/predict-server/types';

interface ArenaOverviewPanelProps {
  accountOverview: PredictAccountOverview;
  overview?: PredictMarketOverview;
  streak: ArenaStreak | null;
}

export function ArenaOverviewPanel({
  accountOverview,
  overview,
  streak,
}: ArenaOverviewPanelProps) {
  const { t } = useI18n();
  const now = useNow();
  const positions = usePredictPositions(accountOverview.managerId);
  const rows = positions.data?.rows ?? [];
  const activePosition = useMemo(() => getPriorityPosition(rows), [rows]);
  const streakResolution = useMemo(
    () => (streak ? resolveStreak(streak.legs, rows) : null),
    [rows, streak],
  );
  const oracleSpot = scaleOracleUsd(overview?.oracleState?.latest_price?.spot);
  const oracleTimestamp = overview?.oracleState?.latest_price?.onchain_timestamp ?? null;
  const vaultLiquidity = scaleQuoteAsset(overview?.vaultSummary?.available_liquidity);

  return (
    <section className="terminal-panel rounded-2xl px-4 py-3">
      <div className="grid gap-y-3 divide-y divide-ink-700/50 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-[1.25fr_1fr_1fr_1.2fr]">
        <StatusItem
          detail={
            activePosition
              ? `${getPositionTypeLabel(activePosition.kind, t)} · ${formatPositionInstrument(
                  activePosition,
                )}`
              : t('arenaOverview.position.emptyAction')
          }
          icon={<Zap className="h-4 w-4" aria-hidden="true" />}
          label={t('arenaOverview.position.title')}
          value={activePosition ? formatPositionPnl(activePosition) : t('arenaOverview.position.empty')}
        />
        <StatusItem
          detail={
            oracleTimestamp == null
              ? t('arenaOverview.oracle.waiting')
              : `${t('marketPulse.oracleFreshness')} ${formatFreshness(now, oracleTimestamp)}`
          }
          icon={<Activity className="h-4 w-4" aria-hidden="true" />}
          label={t('marketPulse.oracleSpot')}
          value={oracleSpot == null ? '—' : formatUsd(oracleSpot, { integer: true })}
        />
        <StatusItem
          detail={t('arenaOverview.liquidity.detail')}
          icon={<Database className="h-4 w-4" aria-hidden="true" />}
          label={t('vault.availableLiquidity')}
          value={vaultLiquidity == null ? '—' : formatDUsdc(vaultLiquidity)}
        />
        <StatusItem
          detail={getComboDetail(streakResolution, streak, t)}
          icon={<Flame className="h-4 w-4" aria-hidden="true" />}
          label={t('arenaOverview.combo.title')}
          value={getComboValue(streakResolution)}
          valueTone={streakResolution?.completed ? 'success' : 'default'}
        />
      </div>
    </section>
  );
}

function StatusItem({
  detail,
  icon,
  label,
  value,
  valueTone = 'default',
}: {
  detail: string;
  icon: ReactNode;
  label: string;
  value: string;
  valueTone?: 'default' | 'muted' | 'success';
}) {
  const valueClass =
    valueTone === 'success'
      ? 'text-moss-300'
      : valueTone === 'muted'
        ? 'text-cream-500'
        : 'text-cream-100';

  return (
    <div className="min-w-0 px-0 py-1 sm:px-4 first:sm:pl-0 last:sm:pr-0">
      <div className="metric-label flex items-center gap-2 text-cream-700">
        <span className="text-brass-300">{icon}</span>
        {label}
      </div>
      <div className={`mt-1 truncate text-xl font-bold tabular-nums ${valueClass}`}>{value}</div>
      <div className="mt-0.5 truncate text-xs text-cream-600">{detail}</div>
    </div>
  );
}

function getPriorityPosition(rows: PredictPositionDisplayRow[]) {
  return [...rows].sort((a, b) => {
    const statusDiff = getPositionRank(a.status) - getPositionRank(b.status);
    if (statusDiff !== 0) return statusDiff;
    return b.lastActivityAt - a.lastActivityAt;
  })[0] ?? null;
}

function getPositionRank(status: string) {
  switch (status) {
    case 'active':
      return 0;
    case 'redeemable':
      return 1;
    case 'awaiting_settlement':
      return 2;
    case 'lost':
      return 3;
    default:
      return 4;
  }
}

function formatPositionPnl(row: PredictPositionDisplayRow) {
  const mark = getMarkOrPayout(row);
  if (mark == null) return '—';
  const pnl = mark == null ? null : mark - row.costBasis;
  return formatDUsdc(scaleQuoteAsset(pnl));
}

function getMarkOrPayout(row: PredictPositionDisplayRow) {
  if (row.kind !== 'range') return row.markValue ?? row.totalPayout;
  if (row.status === 'redeemable') return row.openQuantity;
  if (row.status === 'lost') return 0;
  return null;
}

function formatPositionInstrument(row: PredictPositionDisplayRow) {
  if (row.kind === 'range') {
    return `${formatUsd(scaleOracleUsd(row.lowerStrike), { integer: true })} - ${formatUsd(
      scaleOracleUsd(row.higherStrike),
      { integer: true },
    )}`;
  }

  return formatUsd(scaleOracleUsd(row.strike), { integer: true });
}

function getPositionTypeLabel(
  kind: PredictPositionDisplayRow['kind'],
  t: (key: MessageKey) => string,
) {
  switch (kind) {
    case 'above':
      return t('trade.above');
    case 'below':
      return t('trade.below');
    case 'range':
      return t('trade.range');
  }
}

function getComboValue(resolution: StreakResolution | null) {
  return `${resolution?.litMultiplier ?? 1}x`;
}

function getComboDetail(
  resolution: StreakResolution | null,
  streak: ArenaStreak | null,
  t: (key: MessageKey) => string,
) {
  if (!streak || streak.legs.length === 0 || !resolution) {
    return t('arenaOverview.combo.empty');
  }

  if (resolution.completed) return t('arenaOverview.combo.completed');
  if (resolution.busted) return t('arenaOverview.combo.busted');
  if (resolution.surrendered) return t('arenaOverview.combo.surrendered');

  return `${resolution.consecutiveWins}/${STREAK_TARGET} ${t('arenaOverview.combo.progress')}`;
}
