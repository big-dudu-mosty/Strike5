import { Activity, BarChart3, CircleDollarSign, ShieldCheck, Wallet } from 'lucide-react';
import { useState } from 'react';
import { useCurrentAccount, useCurrentNetwork } from '@mysten/dapp-kit-react';
import { ConnectButton } from '@mysten/dapp-kit-react/ui';
import { MarketPulsePanel } from '../components/market-pulse/MarketPulsePanel';
import { TradePanel } from '../components/trade-panel/TradePanel';
import { PositionsPanel } from '../components/positions/PositionsPanel';
import { VaultHealthPanel } from '../components/vault-health/VaultHealthPanel';
import { ChartPanel } from '../components/chart/ChartPanel';
import { LanguageToggle } from '../components/language/LanguageToggle';
import { AccountPanel } from '../components/account/AccountPanel';
import { PREDICT_CONFIG } from '../config/predict';
import { usePredictMarketOverview } from '../hooks/usePredictMarketOverview';
import { useBtcKlines } from '../hooks/useBtcKlines';
import { usePredictAccountOverview } from '../hooks/usePredictAccountOverview';
import { formatPercent, formatTime, scaleOracleUsd } from '../lib/formatters';
import { useI18n } from '../lib/i18n/I18nProvider';
import type { KlineInterval } from '../lib/market-data/types';

export function App() {
  const [chartInterval, setChartInterval] = useState<KlineInterval>('1m');
  const account = useCurrentAccount();
  const network = useCurrentNetwork();
  const marketOverview = usePredictMarketOverview();
  const accountOverview = usePredictAccountOverview();
  const btcKlines = useBtcKlines(chartInterval);
  const activeOracle = marketOverview.data?.activeOracle;
  const { t } = useI18n();
  const chartPrice = btcKlines.data?.latestPrice ?? null;
  const oracleSpot = scaleOracleUsd(marketOverview.data?.oracleState?.latest_price?.spot);
  const oracleDiff =
    chartPrice != null && oracleSpot != null && oracleSpot > 0
      ? (chartPrice - oracleSpot) / oracleSpot
      : null;

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

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <InfoTile
            icon={<BarChart3 className="h-5 w-5" />}
            label={t('tile.productRound.label')}
            value={t('tile.productRound.value')}
            detail={t('tile.productRound.detail')}
          />
          <InfoTile
            icon={<Activity className="h-5 w-5" />}
            label={t('tile.settlement.label')}
            value={activeOracle ? formatTime(activeOracle.expiry) : t('tile.settlement.fallback')}
            detail={t('tile.settlement.detail')}
          />
          <InfoTile
            icon={<ShieldCheck className="h-5 w-5" />}
            label={t('tile.authority.label')}
            value={t('tile.authority.value')}
            detail={t('tile.authority.detail')}
          />
          <InfoTile
            icon={<Wallet className="h-5 w-5" />}
            label={t('tile.wallet.label')}
            value={account ? truncateAddress(account.address) : t('tile.wallet.notConnected')}
            detail={network ?? PREDICT_CONFIG.network}
          />
        </section>

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
            />
            <PositionsPanel />
          </div>

          <aside className="flex flex-col gap-4">
            <MarketPulsePanel
              error={marketOverview.error}
              chartOracleDiff={oracleDiff == null ? null : formatPercent(oracleDiff)}
              chartPrice={chartPrice}
              isLoading={marketOverview.isLoading}
              overview={marketOverview.data}
            />
            <AccountPanel overview={accountOverview} />
            <TradePanel accountOverview={accountOverview} overview={marketOverview.data} />
            <VaultHealthPanel
              error={marketOverview.error}
              isLoading={marketOverview.isLoading}
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

function InfoTile({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-zinc-400">{label}</span>
        <span className="text-emerald-300">{icon}</span>
      </div>
      <div className="mt-3 text-xl font-semibold">{value}</div>
      <div className="mt-1 text-sm text-zinc-500">{detail}</div>
    </div>
  );
}

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
