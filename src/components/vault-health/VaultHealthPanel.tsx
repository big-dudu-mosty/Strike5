import { ShieldCheck } from 'lucide-react';
import {
  formatDUsdc,
  formatPercent,
  scaleQuoteAsset,
} from '../../lib/formatters';
import type { PredictMarketOverview } from '../../lib/predict-server/types';

interface VaultHealthPanelProps {
  overview?: PredictMarketOverview;
  isLoading: boolean;
  error: Error | unknown;
}

export function VaultHealthPanel({ overview, isLoading, error }: VaultHealthPanelProps) {
  const vault = overview?.vaultSummary;
  const vaultRows = [
    ['Vault Balance', formatDUsdc(scaleQuoteAsset(vault?.vault_balance))],
    ['Vault Value', formatDUsdc(scaleQuoteAsset(vault?.vault_value))],
    ['Available Liquidity', formatDUsdc(scaleQuoteAsset(vault?.available_liquidity))],
    ['Total Max Payout', formatDUsdc(scaleQuoteAsset(vault?.total_max_payout))],
    ['Utilization', formatPercent(vault?.utilization)],
    ['PLP Share Price', vault?.plp_share_price ? vault.plp_share_price.toFixed(6) : 'Pending'],
  ];

  return (
    <section className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Vault & Oracle Health</h2>
          <p className="text-sm text-zinc-500">Predict Vault / PLP risk surface</p>
        </div>
        <ShieldCheck className="h-5 w-5 text-emerald-300" aria-hidden="true" />
      </div>

      {error ? (
        <div className="mt-4 rounded-md border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-200">
          Vault summary unavailable from Predict Server.
        </div>
      ) : null}

      <dl className="mt-4 space-y-3">
        {vaultRows.map(([label, value]) => (
          <div className="flex items-center justify-between gap-3 text-sm" key={label}>
            <dt className="text-zinc-500">{label}</dt>
            <dd className="text-right font-medium text-zinc-200">
              {isLoading && value === 'Pending' ? 'Loading...' : value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
