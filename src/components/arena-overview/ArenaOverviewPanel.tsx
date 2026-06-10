import { BadgeCheck, Flame, Medal, ShieldCheck, Zap } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { useLeaderboardStats } from '../../hooks/useLeaderboardStats';
import {
  usePredictPositions,
  type PredictPositionDisplayRow,
} from '../../hooks/usePredictPositions';
import {
  STREAK_TARGET,
  resolveStreak,
  type ArenaStreak,
} from '../../lib/combo';
import {
  formatDUsdc,
  formatPercent,
  formatTime,
  formatUsd,
  scaleOracleUsd,
  scaleQuoteAsset,
} from '../../lib/formatters';
import { useI18n } from '../../lib/i18n/I18nProvider';
import type { MessageKey } from '../../lib/i18n/types';
import type { PredictMarketOverview } from '../../lib/predict-server/types';

interface ArenaOverviewPanelProps {
  managerId: string | null;
  overview?: PredictMarketOverview;
  streak: ArenaStreak | null;
}

export function ArenaOverviewPanel({
  managerId,
  overview,
  streak,
}: ArenaOverviewPanelProps) {
  const { t } = useI18n();
  const positions = usePredictPositions(managerId);
  const leaderboard = useLeaderboardStats(managerId);
  const rows = positions.data?.rows ?? [];
  const activePosition = useMemo(() => getPriorityPosition(rows), [rows]);
  const streakResolution = useMemo(
    () => (streak ? resolveStreak(streak.legs, rows) : null),
    [rows, streak],
  );
  const vaultLiquidity = scaleQuoteAsset(overview?.vaultSummary?.available_liquidity);
  const oracleSpot = scaleOracleUsd(overview?.oracleState?.latest_price?.spot);

  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <OverviewCard
        icon={<Zap className="h-4 w-4" aria-hidden="true" />}
        title={t('arenaOverview.position.title')}
        tone="brass"
      >
        {activePosition ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-2xl font-bold tracking-tight text-cream-100">
                  {formatPositionPnl(activePosition)}
                </div>
                <div className="mt-1 truncate text-sm text-cream-500">
                  {getPositionTypeLabel(activePosition.kind, t)} · {formatInstrument(activePosition)}
                </div>
              </div>
              <StatusPill status={activePosition.status} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Metric
                label={t('positions.openSize')}
                value={formatDUsdc(scaleQuoteAsset(activePosition.openQuantity))}
              />
              <Metric label={t('positions.expiry')} value={formatTime(activePosition.expiry)} />
            </div>
          </>
        ) : (
          <EmptyState body={t('arenaOverview.position.empty')} />
        )}
      </OverviewCard>

      <OverviewCard
        icon={<Flame className="h-4 w-4" aria-hidden="true" />}
        title={t('arenaOverview.streak.title')}
        tone="brass"
      >
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-3xl font-bold tracking-tight text-cream-100">
              {streakResolution ? `${streakResolution.litMultiplier}x` : '1x'}
            </div>
            <div className="mt-1 truncate text-sm text-cream-500">
              {streakResolution
                ? `${streakResolution.consecutiveWins}/${STREAK_TARGET} ${t(
                    'arenaOverview.streak.wins',
                  )}`
                : t('arenaOverview.streak.empty')}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {Array.from({ length: STREAK_TARGET }, (_, index) => (
              <span
                className={`flex h-8 w-10 items-center justify-center rounded-xl text-xs font-bold ${
                  streakResolution && index < streakResolution.consecutiveWins
                    ? 'bg-brass-400 text-ink-950'
                    : 'bg-ink-800 text-cream-600'
                }`}
                key={index}
              >
                {2 ** (index + 1)}x
              </span>
            ))}
          </div>
        </div>
      </OverviewCard>

      <OverviewCard
        icon={<Medal className="h-4 w-4" aria-hidden="true" />}
        title={t('arenaOverview.leaderboard.title')}
        tone="moss"
      >
        <div className="grid grid-cols-2 gap-3">
          <Metric
            label={t('leaderboard.winRate')}
            value={leaderboard.data?.winRate == null ? '0%' : formatPercent(leaderboard.data.winRate)}
          />
          <Metric
            label={t('leaderboard.streak')}
            value={String(leaderboard.data?.currentStreak ?? 0)}
          />
          <Metric
            label={t('leaderboard.completed')}
            value={String(leaderboard.data?.completedRounds ?? 0)}
          />
          <Metric
            label={t('leaderboard.pnl')}
            value={formatDUsdc(scaleQuoteAsset(leaderboard.data?.totalPnlRaw ?? 0))}
          />
        </div>
        <p className="mt-3 text-xs leading-5 text-cream-600">
          {t('arenaOverview.leaderboard.note')}
        </p>
      </OverviewCard>

      <OverviewCard
        icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
        title={t('arenaOverview.protocol.title')}
        tone="ink"
      >
        <div className="grid grid-cols-2 gap-3">
          <Metric
            label={t('marketPulse.oracleSpot')}
            value={formatUsd(oracleSpot, { integer: true })}
          />
          <Metric
            label={t('vault.availableLiquidity')}
            value={formatDUsdc(vaultLiquidity)}
          />
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-brass-400/25 bg-brass-400/10 p-3 text-xs leading-5 text-brass-200">
          <BadgeCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
          {t('arenaOverview.protocol.note')}
        </div>
      </OverviewCard>
    </section>
  );
}

function OverviewCard({
  children,
  icon,
  title,
  tone,
}: {
  children: ReactNode;
  icon: ReactNode;
  title: string;
  tone: 'brass' | 'ink' | 'moss';
}) {
  const toneClass =
    tone === 'moss'
      ? 'border-t-moss-400/60'
      : tone === 'brass'
        ? 'border-t-brass-400/70'
        : 'border-t-ink-500';

  return (
    <article
      className={`min-h-[156px] rounded-3xl border border-t-2 border-ink-700/60 ${toneClass} glass p-5`}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-cream-100">{title}</h3>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cream-100/10 text-brass-300">
          {icon}
        </span>
      </div>
      <div className="mt-4">{children}</div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-xs text-cream-600">{label}</div>
      <div className="mt-1 truncate text-sm font-bold text-cream-100">{value}</div>
    </div>
  );
}

function EmptyState({ body }: { body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink-600 p-4 text-sm leading-6 text-cream-600">
      {body}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const { t } = useI18n();

  return (
    <span className="shrink-0 rounded-full border border-brass-400/35 bg-brass-400/10 px-2.5 py-1 text-xs font-bold text-brass-200">
      {getStatusLabel(status, t)}
    </span>
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
  const pnl = mark == null ? null : mark - row.costBasis;
  return formatDUsdc(scaleQuoteAsset(pnl));
}

function getMarkOrPayout(row: PredictPositionDisplayRow) {
  if (row.kind !== 'range') return row.markValue ?? row.totalPayout;
  if (row.status === 'redeemable') return row.openQuantity;
  if (row.status === 'lost') return 0;
  return null;
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
