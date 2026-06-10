import { ExternalLink, ShieldCheck } from 'lucide-react';
import { PREDICT_CONFIG } from '../../config/predict';
import { formatDUsdc, scaleQuoteAsset } from '../../lib/formatters';
import { useI18n } from '../../lib/i18n/I18nProvider';
import type { PredictMarketOverview } from '../../lib/predict-server/types';

interface PredictStatusStripProps {
  managerId: string | null;
  overview?: PredictMarketOverview;
}

/**
 * Compact proof-of-real strip: surfaces the live DeepBook Predict backbone
 * (vault liquidity, the user's PredictManager, contract link) without
 * interrupting the trading flow.
 */
export function PredictStatusStrip({ managerId, overview }: PredictStatusStripProps) {
  const { t } = useI18n();
  const availableLiquidity = scaleQuoteAsset(overview?.vaultSummary?.available_liquidity);

  return (
    <section className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-2xl border border-ink-700/60 glass px-5 py-3 text-xs">
      <span className="inline-flex items-center gap-1.5 font-semibold text-cream-300">
        <ShieldCheck className="h-4 w-4 text-brass-300" aria-hidden="true" />
        {t('predict.powered')}
      </span>

      <span className="flex flex-wrap items-center gap-x-6 gap-y-2 text-cream-600">
        <StripItem
          label={t('vault.availableLiquidity')}
          value={availableLiquidity == null ? '—' : formatDUsdc(availableLiquidity)}
        />
        <StripItem
          label={t('account.manager')}
          value={managerId ? truncate(managerId) : t('account.managerMissing')}
        />
        <a
          className="inline-flex items-center gap-1 font-medium text-cream-300 underline-offset-4 transition hover:text-brass-200 hover:underline"
          href={`${PREDICT_CONFIG.suiVisionTxBaseUrl.replace('/txblock', '')}/package/${PREDICT_CONFIG.predictPackageId}`}
          rel="noreferrer"
          target="_blank"
        >
          {t('predict.package')} {truncate(PREDICT_CONFIG.predictPackageId)}
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      </span>
    </section>
  );
}

function StripItem({ label, value }: { label: string; value: string }) {
  return (
    <span>
      {label} <span className="font-medium text-cream-300">{value}</span>
    </span>
  );
}

function truncate(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}
