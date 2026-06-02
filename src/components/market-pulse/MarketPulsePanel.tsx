import { Activity } from 'lucide-react';
import { useNow } from '../../hooks/useNow';
import {
  formatDuration,
  formatFreshness,
  formatTime,
  formatUsd,
  scaleOracleUsd,
} from '../../lib/formatters';
import type { PredictMarketOverview } from '../../lib/predict-server/types';

interface MarketPulsePanelProps {
  overview?: PredictMarketOverview;
  isLoading: boolean;
  error: Error | unknown;
}

export function MarketPulsePanel({ overview, isLoading, error }: MarketPulsePanelProps) {
  const now = useNow();
  const latestPrice = overview?.oracleState?.latest_price;
  const activeOracle = overview?.activeOracle;
  const nextOracle = overview?.nextOracle;
  const oracleSpot = scaleOracleUsd(latestPrice?.spot);
  const forward = scaleOracleUsd(latestPrice?.forward);

  const pulseRows = [
    ['Chart Price', 'Pending provider'],
    ['Oracle Spot', formatUsd(oracleSpot)],
    ['Oracle Forward', formatUsd(forward)],
    ['Chart / Oracle Diff', 'Pending chart provider'],
    ['Oracle Freshness', latestPrice ? formatFreshness(now, latestPrice.onchain_timestamp) : 'Pending'],
    ['Time Left', activeOracle ? formatDuration(activeOracle.expiry - now) : 'Pending'],
    ['Current Expiry', activeOracle ? formatTime(activeOracle.expiry) : 'Pending'],
    ['Next Expiry', nextOracle ? formatTime(nextOracle.expiry) : 'Pending'],
  ];

  return (
    <section className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Market Pulse</h2>
          <p className="text-sm text-zinc-500">Chart reference vs DeepBook Predict oracle</p>
        </div>
        <Activity className="h-5 w-5 text-emerald-300" aria-hidden="true" />
      </div>

      {error ? (
        <div className="mt-4 rounded-md border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-200">
          Predict Server data unavailable. Critical trading state will still require Sui RPC
          confirmation.
        </div>
      ) : null}

      <dl className="mt-4 space-y-3">
        {pulseRows.map(([label, value]) => (
          <div className="flex items-center justify-between gap-3 text-sm" key={label}>
            <dt className="text-zinc-500">{label}</dt>
            <dd className="text-right font-medium text-zinc-200">
              {isLoading && value === 'Pending' ? 'Loading...' : value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 rounded-md border border-zinc-800 bg-zinc-950 p-3 text-xs leading-5 text-zinc-500">
        Chart price is a visual reference. Quotes and settlement use DeepBook Predict OracleSVI.
      </div>
    </section>
  );
}
