import { Activity } from 'lucide-react';
import { useNow } from '../../hooks/useNow';
import {
  formatDuration,
  formatFreshness,
  formatTime,
  formatUsd,
  scaleOracleUsd,
} from '../../lib/formatters';
import { useI18n } from '../../lib/i18n/I18nProvider';
import type { PredictMarketOverview } from '../../lib/predict-server/types';

interface MarketPulsePanelProps {
  overview?: PredictMarketOverview;
  isLoading: boolean;
  error: Error | unknown;
}

export function MarketPulsePanel({ overview, isLoading, error }: MarketPulsePanelProps) {
  const { t } = useI18n();
  const now = useNow();
  const latestPrice = overview?.oracleState?.latest_price;
  const activeOracle = overview?.activeOracle;
  const nextOracle = overview?.nextOracle;
  const oracleSpot = scaleOracleUsd(latestPrice?.spot);
  const forward = scaleOracleUsd(latestPrice?.forward);
  const pending = t('marketPulse.pending');

  const pulseRows = [
    [t('marketPulse.chartPrice'), t('marketPulse.pendingProvider')],
    [t('marketPulse.oracleSpot'), oracleSpot == null ? pending : formatUsd(oracleSpot)],
    [t('marketPulse.oracleForward'), forward == null ? pending : formatUsd(forward)],
    [t('marketPulse.chartOracleDiff'), t('marketPulse.pendingChartProvider')],
    [
      t('marketPulse.oracleFreshness'),
      latestPrice ? formatFreshness(now, latestPrice.onchain_timestamp) : pending,
    ],
    [
      t('marketPulse.timeLeft'),
      activeOracle ? formatDuration(activeOracle.expiry - now) : pending,
    ],
    [
      t('marketPulse.currentExpiry'),
      activeOracle ? formatTime(activeOracle.expiry) : pending,
    ],
    [t('marketPulse.nextExpiry'), nextOracle ? formatTime(nextOracle.expiry) : pending],
  ];

  return (
    <section className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{t('marketPulse.title')}</h2>
          <p className="text-sm text-zinc-500">{t('marketPulse.subtitle')}</p>
        </div>
        <Activity className="h-5 w-5 text-emerald-300" aria-hidden="true" />
      </div>

      {error ? (
        <div className="mt-4 rounded-md border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-200">
          {t('marketPulse.error')}
        </div>
      ) : null}

      <dl className="mt-4 space-y-3">
        {pulseRows.map(([label, value]) => (
          <div className="flex items-center justify-between gap-3 text-sm" key={label}>
            <dt className="text-zinc-500">{label}</dt>
            <dd className="text-right font-medium text-zinc-200">
              {isLoading && value === pending ? t('marketPulse.loading') : value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 rounded-md border border-zinc-800 bg-zinc-950 p-3 text-xs leading-5 text-zinc-500">
        {t('marketPulse.note')}
      </div>
    </section>
  );
}
