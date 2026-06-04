import { AlertTriangle, CheckCircle2, CircleDashed, PlayCircle } from 'lucide-react';
import type { PredictAccountOverview } from '../../hooks/usePredictAccountOverview';
import { usePredictPositions } from '../../hooks/usePredictPositions';
import { formatDUsdc, scaleQuoteAsset } from '../../lib/formatters';
import { useI18n } from '../../lib/i18n/I18nProvider';
import type { MessageKey } from '../../lib/i18n/types';
import type { PredictMarketOverview } from '../../lib/predict-server/types';

interface DemoReadinessPanelProps {
  accountOverview: PredictAccountOverview;
  hasChartPrice: boolean;
  isMarketLoading: boolean;
  marketError: unknown;
  overview: PredictMarketOverview | undefined;
}

type ReadinessState = 'ready' | 'pending' | 'blocked';

interface ReadinessItem {
  detail: string;
  labelKey: MessageKey;
  state: ReadinessState;
}

export function DemoReadinessPanel({
  accountOverview,
  hasChartPrice,
  isMarketLoading,
  marketError,
  overview,
}: DemoReadinessPanelProps) {
  const { t } = useI18n();
  const positions = usePredictPositions(accountOverview.managerId);
  const managerDUsdcRaw =
    accountOverview.managerSummary?.trading_balance == null
      ? null
      : BigInt(Math.max(0, accountOverview.managerSummary.trading_balance));
  const totalSpendableRaw =
    accountOverview.walletDUsdcBalanceRaw == null || managerDUsdcRaw == null
      ? null
      : accountOverview.walletDUsdcBalanceRaw + managerDUsdcRaw;
  const redeemableCount =
    positions.data?.rows.filter((row) => row.status === 'redeemable' || row.status === 'lost').length ??
    0;
  const activeOracle = overview?.activeOracle ?? null;
  const items: ReadinessItem[] = [
    {
      detail: accountOverview.address ? truncateAddress(accountOverview.address) : t('demo.missing'),
      labelKey: 'demo.wallet',
      state: accountOverview.address ? 'ready' : 'blocked',
    },
    {
      detail: accountOverview.currentNetwork ?? t('demo.missing'),
      labelKey: 'demo.network',
      state: accountOverview.isExpectedNetwork ? 'ready' : accountOverview.currentNetwork ? 'blocked' : 'pending',
    },
    {
      detail:
        totalSpendableRaw == null
          ? t('demo.loading')
          : formatDUsdc(scaleQuoteAsset(Number(totalSpendableRaw))),
      labelKey: 'demo.funds',
      state: totalSpendableRaw == null ? 'pending' : totalSpendableRaw > 0n ? 'ready' : 'blocked',
    },
    {
      detail: accountOverview.managerId ? truncateAddress(accountOverview.managerId) : t('demo.missing'),
      labelKey: 'demo.manager',
      state: accountOverview.managerId ? 'ready' : accountOverview.address ? 'blocked' : 'pending',
    },
    {
      detail: activeOracle ? formatExpiry(activeOracle.expiry) : isMarketLoading ? t('demo.loading') : t('demo.missing'),
      labelKey: 'demo.oracle',
      state: activeOracle ? 'ready' : isMarketLoading ? 'pending' : 'blocked',
    },
    {
      detail: hasChartPrice ? t('demo.ready') : t('demo.loading'),
      labelKey: 'demo.chart',
      state: hasChartPrice ? 'ready' : 'pending',
    },
    {
      detail: positions.isLoading ? t('demo.loading') : String(redeemableCount),
      labelKey: 'demo.redeemable',
      state: redeemableCount > 0 ? 'ready' : positions.isLoading ? 'pending' : 'blocked',
    },
  ];
  const isReadyToOpen =
    Boolean(accountOverview.address) &&
    accountOverview.isExpectedNetwork &&
    Boolean(accountOverview.managerId) &&
    Boolean(activeOracle) &&
    totalSpendableRaw != null &&
    totalSpendableRaw > 0n &&
    !marketError;

  return (
    <section className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{t('demo.title')}</h2>
          <p className="text-sm text-zinc-500">{t('demo.subtitle')}</p>
        </div>
        <PlayCircle className="h-5 w-5 text-emerald-300" aria-hidden="true" />
      </div>

      <div
        className={`mt-4 rounded-md border p-3 text-sm ${
          isReadyToOpen
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
            : 'border-amber-500/30 bg-amber-500/10 text-amber-100'
        }`}
      >
        {isReadyToOpen ? t('demo.readyToOpen') : t('demo.needsSetup')}
      </div>

      <div className="mt-4 grid gap-2">
        {items.map((item) => (
          <ReadinessRow item={item} key={item.labelKey} />
        ))}
      </div>
    </section>
  );
}

function ReadinessRow({ item }: { item: ReadinessItem }) {
  const { t } = useI18n();
  const Icon =
    item.state === 'ready' ? CheckCircle2 : item.state === 'pending' ? CircleDashed : AlertTriangle;
  const colorClass =
    item.state === 'ready'
      ? 'text-emerald-300'
      : item.state === 'pending'
        ? 'text-zinc-400'
        : 'text-amber-300';

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className={`h-4 w-4 shrink-0 ${colorClass}`} aria-hidden="true" />
        <span className="truncate text-zinc-400">{t(item.labelKey)}</span>
      </div>
      <span className="truncate text-right font-medium text-zinc-100">{item.detail}</span>
    </div>
  );
}

function formatExpiry(expiry: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(expiry));
}

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
