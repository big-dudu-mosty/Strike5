import { CheckCircle2, Loader2, Plus, Wallet } from 'lucide-react';
import { PREDICT_CONFIG } from '../../config/predict';
import { formatDUsdc, scaleQuoteAsset } from '../../lib/formatters';
import { useI18n } from '../../lib/i18n/I18nProvider';
import type { PredictAccountOverview } from '../../hooks/usePredictAccountOverview';
import { TransactionLink } from '../transaction/TransactionLink';

interface AccountPanelProps {
  overview: PredictAccountOverview;
}

export function AccountPanel({ overview }: AccountPanelProps) {
  const { t } = useI18n();
  const {
    address,
    createdManagerHint,
    createManagerMutation,
    currentNetwork,
    currentWallet,
    isExpectedNetwork,
    managerId,
    managerSource,
    managerSummary,
    managerSummaryQuery,
    walletBalanceQuery,
    walletDUsdcBalance,
  } = overview;

  return (
    <section className="rounded-3xl border border-ink-700/60 glass p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-cream-100">
            {t('account.title')}
          </h2>
          <p className="text-sm text-cream-600">{t('account.subtitle')}</p>
        </div>
        <Wallet className="h-5 w-5 text-brass-300" aria-hidden="true" />
      </div>

      {!address ? (
        <div className="mt-4 rounded-xl border border-dashed border-ink-600 p-4 text-sm text-cream-600">
          {t('account.connectPrompt')}
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          <AccountRow label={t('account.wallet')} value={truncateAddress(address)} />
          <AccountRow
            label={t('account.connectedWallet')}
            value={currentWallet?.name ?? t('account.unknownWallet')}
          />
          <AccountRow
            label={t('account.network')}
            value={currentNetwork ?? PREDICT_CONFIG.network}
            tone={isExpectedNetwork ? 'ok' : 'warn'}
          />
          <AccountRow
            label={t('account.walletDUsdc')}
            value={
              walletBalanceQuery.isLoading
                ? t('account.loading')
                : formatDUsdc(walletDUsdcBalance)
            }
          />

          <div className="rounded-xl border border-ink-700 bg-ink-950 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm text-cream-500">{t('account.manager')}</div>
                <div className="mt-1 text-sm font-medium text-cream-100">
                  {managerId ? truncateAddress(managerId) : t('account.managerMissing')}
                </div>
              </div>
              {managerId ? (
                <CheckCircle2 className="h-5 w-5 text-moss-300" aria-hidden="true" />
              ) : null}
            </div>

            {managerId ? (
              <div className="mt-3 grid gap-2 text-sm">
                <AccountRow
                  label={t('account.managerSource')}
                  value={
                    managerSource === 'indexed'
                      ? t('account.managerIndexed')
                      : t('account.managerFromTx')
                  }
                />
                <AccountRow
                  label={t('account.managerDUsdc')}
                  value={
                    managerSummaryQuery.isLoading
                      ? t('account.loading')
                      : formatDUsdc(scaleQuoteAsset(managerSummary?.trading_balance))
                  }
                />
                <AccountRow
                  label={t('account.accountValue')}
                  value={
                    managerSummaryQuery.isLoading
                      ? t('account.loading')
                      : formatDUsdc(scaleQuoteAsset(managerSummary?.account_value))
                  }
                />
                <AccountRow
                  label={t('account.openPositions')}
                  value={
                    managerSummary
                      ? String(managerSummary.open_positions)
                      : t('account.awaitingIndexer')
                  }
                />
              </div>
            ) : (
              <button
                className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brass-400 px-3 text-sm font-semibold text-ink-950 transition hover:bg-brass-300 disabled:cursor-not-allowed disabled:bg-ink-700 disabled:text-cream-600"
                disabled={!isExpectedNetwork || createManagerMutation.isPending}
                onClick={() => void overview.createManager()}
                type="button"
              >
                {createManagerMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Plus className="h-4 w-4" aria-hidden="true" />
                )}
                {createManagerMutation.isPending
                  ? t('account.creatingManager')
                    : t('account.createManager')}
              </button>
            )}

            {createdManagerHint ? (
              <div className="mt-3 rounded-xl border border-moss-400/30 bg-moss-400/10 p-3 text-sm">
                <TransactionLink digest={createdManagerHint.digest} label={t('account.lastTx')} />
              </div>
            ) : null}

            {createManagerMutation.error ? (
              <div className="mt-3 rounded-xl border border-clay-400/40 bg-clay-400/10 p-3 text-sm text-clay-200">
                {createManagerMutation.error.message}
              </div>
            ) : null}

            {!isExpectedNetwork ? (
              <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                {t('account.networkWarning')}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}

function AccountRow({
  label,
  tone,
  value,
}: {
  label: string;
  tone?: 'ok' | 'warn';
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-cream-600">{label}</span>
      <span
        className={
          tone === 'ok'
            ? 'font-medium text-moss-300'
            : tone === 'warn'
              ? 'font-medium text-amber-300'
              : 'font-medium text-cream-200'
        }
      >
        {value}
      </span>
    </div>
  );
}

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
