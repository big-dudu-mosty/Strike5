import { Activity, CircleDollarSign, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ConnectButton } from '@mysten/dapp-kit-react/ui';
import { MarketPulsePanel } from '../components/market-pulse/MarketPulsePanel';
import { TradePanel } from '../components/trade-panel/TradePanel';
import { PositionsPanel } from '../components/positions/PositionsPanel';
import { ChartPanel, type ChartTradeOverlay } from '../components/chart/ChartPanel';
import { LanguageToggle } from '../components/language/LanguageToggle';
import { AccountPanel } from '../components/account/AccountPanel';
import { DemoReadinessPanel } from '../components/demo-readiness/DemoReadinessPanel';
import { usePredictMarketOverview } from '../hooks/usePredictMarketOverview';
import { useBtcKlines } from '../hooks/useBtcKlines';
import { usePredictAccountOverview } from '../hooks/usePredictAccountOverview';
import { formatPercent, scaleOracleUsd } from '../lib/formatters';
import { useI18n } from '../lib/i18n/I18nProvider';
import type { TradeQuoteRequest } from '../lib/deepbook/quote';
import type { KlineInterval } from '../lib/market-data/types';

export function App() {
  const [chartInterval, setChartInterval] = useState<KlineInterval>('1m');
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

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-4 md:px-6">
        <header className="flex flex-col gap-3 border-b border-zinc-800 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-400 text-zinc-950">
                <Activity className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-normal">Strike5</h1>
                <p className="text-sm text-zinc-400">{t('app.tagline')}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <LanguageToggle />
            <StatusBadge icon={<ShieldCheck className="h-4 w-4" />} label={t('status.suiTestnet')} />
            <StatusBadge icon={<CircleDollarSign className="h-4 w-4" />} label={t('status.dusdc')} />
            <ConnectButton />
          </div>
        </header>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.85fr)]">
          <div className="flex flex-col gap-4">
            <ChartPanel
              candles={btcKlines.data?.candles ?? []}
              error={btcKlines.error}
              interval={chartInterval}
              isLoading={btcKlines.isLoading}
              onIntervalChange={setChartInterval}
              oracleSpot={oracleSpot}
              provider={btcKlines.data?.provider}
              tradeOverlay={tradeOverlay}
            />
            <PositionsPanel
              isExpectedNetwork={accountOverview.isExpectedNetwork}
              managerId={accountOverview.managerId}
            />
          </div>

          <aside className="flex flex-col gap-4">
            <DemoReadinessPanel
              accountOverview={accountOverview}
              hasChartPrice={chartPrice != null}
              isMarketLoading={marketOverview.isLoading}
              marketError={marketOverview.error}
              overview={marketOverview.data}
            />
            <MarketPulsePanel
              error={marketOverview.error}
              chartOracleDiff={oracleDiff == null ? null : formatPercent(oracleDiff)}
              chartPrice={chartPrice}
              isLoading={marketOverview.isLoading}
              overview={marketOverview.data}
            />
            <AccountPanel overview={accountOverview} />
            <TradePanel
              accountOverview={accountOverview}
              onQuoteRequestChange={setSelectedTradeRequest}
              overview={marketOverview.data}
            />
          </aside>
        </section>
      </div>
    </main>
  );
}

function StatusBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-300">
      <span className="text-emerald-300">{icon}</span>
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
