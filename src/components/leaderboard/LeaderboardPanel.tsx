import { EyeOff, Medal, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { PredictAccountOverview } from '../../hooks/usePredictAccountOverview';
import {
  MIN_COMPLETED_ROUNDS,
  useLeaderboardStats,
  type LeaderboardStats,
} from '../../hooks/useLeaderboardStats';
import { formatDUsdcRaw, formatPercent } from '../../lib/formatters';
import { useI18n } from '../../lib/i18n/I18nProvider';

const STORAGE_KEY = 'strike5.leaderboard.optins.v1';

interface LeaderboardPanelProps {
  accountOverview: PredictAccountOverview;
}

interface LeaderboardOptIn {
  address: string;
  alias: string;
  managerId: string;
  optedInAt: number;
}

export function LeaderboardPanel({ accountOverview }: LeaderboardPanelProps) {
  const { t } = useI18n();
  const statsQuery = useLeaderboardStats(accountOverview.managerId);
  const [optIns, setOptIns] = useState<Record<string, LeaderboardOptIn>>({});
  const address = accountOverview.address;
  const optIn = address ? optIns[address] ?? null : null;
  const stats = statsQuery.data ?? null;
  const boardRows = useMemo(() => {
    if (!address || !optIn || !stats?.eligible) return [];

    return [{
      address,
      alias: optIn.alias,
      stats,
    }];
  }, [address, optIn, stats]);

  useEffect(() => {
    setOptIns(readOptIns());
  }, []);

  function persist(next: Record<string, LeaderboardOptIn>) {
    setOptIns(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function joinLeaderboard() {
    if (!address || !accountOverview.managerId) return;

    persist({
      ...optIns,
      [address]: {
        address,
        alias: formatAlias(address),
        managerId: accountOverview.managerId,
        optedInAt: Date.now(),
      },
    });
  }

  function hideFromLeaderboard() {
    if (!address) return;

    const next = { ...optIns };
    delete next[address];
    persist(next);
  }

  return (
    <section className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{t('leaderboard.title')}</h2>
          <p className="text-sm text-zinc-500">{t('leaderboard.subtitle')}</p>
        </div>
        <Medal className="mt-0.5 h-5 w-5 text-emerald-300" aria-hidden="true" />
      </div>

      <div className="mt-4 rounded-md border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-400">
        <div className="flex gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
          <p>{t('leaderboard.privacy')}</p>
        </div>
      </div>

      {!address ? (
        <div className="mt-4 text-sm text-amber-200">{t('leaderboard.connectWallet')}</div>
      ) : !accountOverview.managerId ? (
        <div className="mt-4 text-sm text-amber-200">{t('leaderboard.managerRequired')}</div>
      ) : optIn ? (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3">
          <div>
            <div className="text-sm font-semibold text-emerald-100">{optIn.alias}</div>
            <div className="mt-1 text-xs text-emerald-100/70">{t('leaderboard.public')}</div>
          </div>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-700 px-3 text-sm text-zinc-200 transition hover:border-zinc-500"
            onClick={hideFromLeaderboard}
            type="button"
          >
            <EyeOff className="h-4 w-4" aria-hidden="true" />
            {t('leaderboard.hide')}
          </button>
        </div>
      ) : (
        <button
          className="mt-4 h-10 w-full rounded-md bg-emerald-400 px-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300"
          onClick={joinLeaderboard}
          type="button"
        >
          {t('leaderboard.join')}
        </button>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatTile label={t('leaderboard.winRate')} value={formatWinRate(stats)} />
        <StatTile label={t('leaderboard.completed')} value={stats ? String(stats.completedRounds) : '0'} />
        <StatTile label={t('leaderboard.streak')} value={stats ? String(stats.currentStreak) : '0'} />
        <StatTile label={t('leaderboard.pnl')} value={formatPnl(stats)} />
      </div>

      {statsQuery.isLoading ? (
        <div className="mt-4 text-sm text-zinc-500">{t('leaderboard.loading')}</div>
      ) : null}
      {statsQuery.error ? (
        <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {t('leaderboard.error')}
        </div>
      ) : null}

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-zinc-100">{t('leaderboard.top10')}</h3>
          <span className="text-xs text-zinc-500">
            {t('leaderboard.minRounds')} {MIN_COMPLETED_ROUNDS}
          </span>
        </div>

        <div className="mt-3 overflow-hidden rounded-md border border-zinc-800">
          {boardRows.length > 0 ? (
            boardRows.map((row, index) => (
              <div
                className="grid grid-cols-[44px_minmax(0,1fr)_76px_64px] items-center gap-3 bg-zinc-950 p-3 text-sm"
                key={row.address}
              >
                <span className="text-zinc-500">#{index + 1}</span>
                <span className="truncate font-medium text-zinc-100">{row.alias}</span>
                <span className="text-right text-emerald-200">{formatWinRate(row.stats)}</span>
                <span className="text-right text-zinc-400">{row.stats.completedRounds}</span>
              </div>
            ))
          ) : (
            <div className="bg-zinc-950 p-3 text-sm text-zinc-500">
              {optIn ? t('leaderboard.notEligible') : t('leaderboard.empty')}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-zinc-100">{value}</div>
    </div>
  );
}

function formatWinRate(stats: LeaderboardStats | null) {
  return stats?.winRate == null ? '0%' : formatPercent(stats.winRate);
}

function formatPnl(stats: LeaderboardStats | null) {
  if (!stats) return formatDUsdcRaw(0n);
  return formatDUsdcRaw(BigInt(Math.round(stats.totalPnlRaw)));
}

function formatAlias(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function readOptIns() {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, LeaderboardOptIn>;
  } catch {
    return {};
  }
}
