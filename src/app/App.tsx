import { Activity, ListChecks, MessageSquare, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ConnectButton } from '@mysten/dapp-kit-react/ui';
import { TradePanel } from '../components/trade-panel/TradePanel';
import { PositionsPanel } from '../components/positions/PositionsPanel';
import { ChartPanel, type ChartTradeOverlay } from '../components/chart/ChartPanel';
import { LanguageToggle } from '../components/language/LanguageToggle';
import { AccountPanel } from '../components/account/AccountPanel';
import { LeaderboardPanel } from '../components/leaderboard/LeaderboardPanel';
import { ArenaFeedPanel } from '../components/social-feed/ArenaFeedPanel';
import { ComboPanel } from '../components/combo/ComboPanel';
import { StreakMeter } from '../components/combo/StreakMeter';
import { ArenaOverviewPanel } from '../components/arena-overview/ArenaOverviewPanel';
import { PredictStatusStrip } from '../components/predict-status/PredictStatusStrip';
import { SealedCallsPanel } from '../components/sealed-calls/SealedCallsPanel';
import { usePredictMarketOverview } from '../hooks/usePredictMarketOverview';
import { useBtcKlines } from '../hooks/useBtcKlines';
import { usePredictAccountOverview } from '../hooks/usePredictAccountOverview';
import {
  getStreakAppendError,
  isStreakTerminal,
  type ArenaComboLeg,
  type ArenaStreak,
  type StreakLegResult,
} from '../lib/combo';
import { scaleOracleUsd } from '../lib/formatters';
import { useI18n } from '../lib/i18n/I18nProvider';
import type { TradeQuoteRequest } from '../lib/deepbook/quote';
import type { KlineInterval } from '../lib/market-data/types';
import type { MessageKey } from '../lib/i18n/types';

type AppPage = 'arena' | 'playbook' | 'community';

const appPages = [
  {
    icon: Activity,
    key: 'arena',
    labelKey: 'nav.arena',
  },
  {
    icon: ListChecks,
    key: 'playbook',
    labelKey: 'nav.playbook',
  },
  {
    icon: MessageSquare,
    key: 'community',
    labelKey: 'nav.community',
  },
] satisfies Array<{
  icon: typeof Activity;
  key: AppPage;
  labelKey: MessageKey;
}>;

export function App() {
  const [activePage, setActivePage] = useState<AppPage>('arena');
  const [chartInterval, setChartInterval] = useState<KlineInterval>('1m');
  const [currentStreak, setCurrentStreak] = useState<ArenaStreak | null>(() => readCurrentStreak());
  const [archivedStreaks, setArchivedStreaks] = useState<ArenaStreak[]>(() => readArchivedStreaks());
  const [selectedTradeRequest, setSelectedTradeRequest] = useState<TradeQuoteRequest | null>(null);
  const marketOverview = usePredictMarketOverview();
  const accountOverview = usePredictAccountOverview();
  const btcKlines = useBtcKlines(chartInterval);
  const { t } = useI18n();
  const chartPrice = btcKlines.data?.latestPrice ?? null;
  const oracleSpot = scaleOracleUsd(marketOverview.data?.oracleState?.latest_price?.spot);
  const oracleDiff =
    chartPrice != null && oracleSpot != null && oracleSpot > 0
      ? (chartPrice - oracleSpot) / oracleSpot
      : null;
  const tradeOverlay = useMemo(() => {
    return buildTradeOverlay(selectedTradeRequest);
  }, [selectedTradeRequest]);

  useEffect(() => {
    window.localStorage.setItem(STREAK_CURRENT_KEY, JSON.stringify(currentStreak));
  }, [currentStreak]);

  useEffect(() => {
    window.localStorage.setItem(STREAK_ARCHIVE_KEY, JSON.stringify(archivedStreaks));
  }, [archivedStreaks]);

  const managerId = accountOverview.managerId;
  const managerCurrentStreak =
    currentStreak && currentStreak.managerId === managerId ? currentStreak : null;
  const managerArchivedStreaks = useMemo(
    () => archivedStreaks.filter((streak) => streak.managerId === managerId),
    [archivedStreaks, managerId],
  );
  const streakLegsForPanel = managerCurrentStreak?.legs ?? [];

  function addComboLeg(leg: ArenaComboLeg) {
    if (!managerId) return;

    const startsFresh =
      !currentStreak ||
      currentStreak.managerId !== managerId ||
      isStreakTerminal(currentStreak.legs);

    if (startsFresh) {
      if (currentStreak && currentStreak.legs.length > 0) {
        setArchivedStreaks((archive) => [currentStreak, ...archive].slice(0, 20));
      }
      setCurrentStreak({
        createdAt: Date.now(),
        id: createStreakId(),
        legs: [leg],
        managerId,
      });
      return;
    }

    const appendError = getStreakAppendError(currentStreak.legs, {
      expiry: BigInt(leg.expiry),
      oracleId: leg.oracleId,
    });
    if (appendError) return;

    setCurrentStreak({ ...currentStreak, legs: [...currentStreak.legs, leg] });
  }

  function clearCurrentStreak() {
    if (currentStreak && currentStreak.legs.length > 0) {
      setArchivedStreaks((archive) => [currentStreak, ...archive].slice(0, 20));
    }
    setCurrentStreak(null);
  }

  function setStreakLegResult(legId: string, result: StreakLegResult) {
    setCurrentStreak((current) => {
      if (!current) return current;
      let changed = false;
      const legs = current.legs.map((leg) => {
        if (leg.id === legId && leg.result !== result) {
          changed = true;
          return { ...leg, result };
        }
        return leg;
      });
      return changed ? { ...current, legs } : current;
    });
  }

  return (
    <main className="min-h-screen bg-ink-950 text-cream-100">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 px-3 py-3 sm:gap-4 sm:px-4 sm:py-4 md:px-6">
        <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brass-400 text-ink-950">
              <Activity className="h-5 w-5" aria-hidden="true" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-cream-100">Strike5</h1>
          </div>

          <nav className="order-3 flex w-full items-center justify-center gap-1 rounded-full border border-ink-700/60 glass p-1 sm:order-none sm:w-auto">
            {appPages.map((page) => {
              const isActive = activePage === page.key;

              return (
                <button
                  className={`inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-cream-100 text-ink-950'
                      : 'text-cream-500 hover:text-cream-100'
                  }`}
                  key={page.key}
                  onClick={() => setActivePage(page.key)}
                  type="button"
                >
                  {t(page.labelKey)}
                </button>
              );
            })}
          </nav>

          <div className="flex flex-wrap items-center gap-2">
            <LanguageToggle />
            <StatusBadge
              icon={<ShieldCheck className="h-4 w-4" />}
              label={`${t('status.suiTestnet')} · ${t('status.dusdc')}`}
            />
            <ConnectButton />
          </div>
        </header>

        {activePage === 'arena' ? (
          <section className="flex flex-col gap-4">
            <ArenaOverviewPanel
              accountOverview={accountOverview}
              overview={marketOverview.data}
            />

            <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
              <div className="flex flex-col gap-4">
                <ChartPanel
                  candles={btcKlines.data?.candles ?? []}
                  chartOracleDiff={oracleDiff}
                  chartPrice={chartPrice}
                  error={btcKlines.error}
                  interval={chartInterval}
                  isLoading={btcKlines.isLoading}
                  onIntervalChange={setChartInterval}
                  oracleSpot={oracleSpot}
                  oracleTimestamp={
                    marketOverview.data?.oracleState?.latest_price?.onchain_timestamp ?? null
                  }
                  provider={btcKlines.data?.provider}
                  roundExpiryMs={marketOverview.data?.activeOracle?.expiry ?? null}
                  tradeOverlay={tradeOverlay}
                />

                <PositionsPanel
                  isExpectedNetwork={accountOverview.isExpectedNetwork}
                  managerId={accountOverview.managerId}
                  onStreakSurrender={(legId) => setStreakLegResult(legId, 'surrendered')}
                  streakLegs={streakLegsForPanel}
                />
              </div>

              <aside className="flex flex-col gap-4">
                <TradePanel
                  accountOverview={accountOverview}
                  onAddComboLeg={addComboLeg}
                  onQuoteRequestChange={setSelectedTradeRequest}
                  overview={marketOverview.data}
                  streakLegs={streakLegsForPanel}
                />
                <StreakMeter managerId={managerId} streak={managerCurrentStreak} />
                <AccountPanel overview={accountOverview} />
              </aside>
            </div>

            <PredictStatusStrip managerId={managerId} overview={marketOverview.data} />
          </section>
        ) : null}

        {activePage === 'playbook' ? (
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <ComboPanel
              archivedStreaks={managerArchivedStreaks}
              currentStreak={managerCurrentStreak}
              managerId={accountOverview.managerId}
              onClearStreak={clearCurrentStreak}
              onLegResult={setStreakLegResult}
            />
            <SealedCallsPanel
              accountOverview={accountOverview}
              activeOracle={marketOverview.data?.activeOracle ?? null}
              oracleSpotRaw={marketOverview.data?.oracleState?.latest_price?.spot ?? null}
            />
          </section>
        ) : null}

        {activePage === 'community' ? (
          <section className="grid gap-4 xl:grid-cols-[minmax(360px,0.8fr)_minmax(0,1.2fr)]">
            <LeaderboardPanel accountOverview={accountOverview} />
            <ArenaFeedPanel accountOverview={accountOverview} />
          </section>
        ) : null}
      </div>
    </main>
  );
}

function StatusBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="inline-flex h-9 items-center gap-2 rounded-full border border-ink-700/60 glass px-3 text-sm text-cream-300">
      <span className="text-brass-300">{icon}</span>
      {label}
    </div>
  );
}

function buildTradeOverlay(request: TradeQuoteRequest | null): ChartTradeOverlay | null {
  if (!request) return null;

  if (request.kind === 'range') {
    return {
      higherStrike: scaleRawOracleStrike(request.higherStrike),
      kind: 'range',
      lowerStrike: scaleRawOracleStrike(request.lowerStrike),
    };
  }

  return {
    kind: request.kind,
    strike: scaleRawOracleStrike(request.strike),
  };
}

function scaleRawOracleStrike(value: bigint) {
  return Number(value) / 1_000_000_000;
}

const STREAK_CURRENT_KEY = 'strike5.combo.streak.current.v2';
const STREAK_ARCHIVE_KEY = 'strike5.combo.streak.archive.v2';

function readCurrentStreak(): ArenaStreak | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(STREAK_CURRENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as ArenaStreak) : null;
  } catch {
    return null;
  }
}

function readArchivedStreaks(): ArenaStreak[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(STREAK_ARCHIVE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ArenaStreak[]) : [];
  } catch {
    return [];
  }
}

function createStreakId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
