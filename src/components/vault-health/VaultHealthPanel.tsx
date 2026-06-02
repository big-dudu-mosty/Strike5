import { ShieldCheck } from 'lucide-react';
import {
  formatDUsdc,
  formatPercent,
  scaleQuoteAsset,
} from '../../lib/formatters';
import { useI18n } from '../../lib/i18n/I18nProvider';
import type { PredictMarketOverview } from '../../lib/predict-server/types';

interface VaultHealthPanelProps {
  overview?: PredictMarketOverview;
  isLoading: boolean;
  error: Error | unknown;
}

export function VaultHealthPanel({ overview, isLoading, error }: VaultHealthPanelProps) {
  const { t } = useI18n();
  const vault = overview?.vaultSummary;
  const pending = t('marketPulse.pending');
  const vaultBalance = scaleQuoteAsset(vault?.vault_balance);
  const vaultValue = scaleQuoteAsset(vault?.vault_value);
  const availableLiquidity = scaleQuoteAsset(vault?.available_liquidity);
  const totalMaxPayout = scaleQuoteAsset(vault?.total_max_payout);

  const vaultRows = [
    [t('vault.balance'), vaultBalance == null ? pending : formatDUsdc(vaultBalance)],
    [t('vault.value'), vaultValue == null ? pending : formatDUsdc(vaultValue)],
    [
      t('vault.availableLiquidity'),
      availableLiquidity == null ? pending : formatDUsdc(availableLiquidity),
    ],
    [t('vault.totalMaxPayout'), totalMaxPayout == null ? pending : formatDUsdc(totalMaxPayout)],
    [t('vault.utilization'), vault?.utilization == null ? pending : formatPercent(vault.utilization)],
    [t('vault.plpSharePrice'), vault?.plp_share_price ? vault.plp_share_price.toFixed(6) : pending],
  ];

  return (
    <section className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{t('vault.title')}</h2>
          <p className="text-sm text-zinc-500">{t('vault.subtitle')}</p>
        </div>
        <ShieldCheck className="h-5 w-5 text-emerald-300" aria-hidden="true" />
      </div>

      {error ? (
        <div className="mt-4 rounded-md border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-200">
          {t('vault.error')}
        </div>
      ) : null}

      <dl className="mt-4 space-y-3">
        {vaultRows.map(([label, value]) => (
          <div className="flex items-center justify-between gap-3 text-sm" key={label}>
            <dt className="text-zinc-500">{label}</dt>
            <dd className="text-right font-medium text-zinc-200">
              {isLoading && value === pending ? t('marketPulse.loading') : value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
