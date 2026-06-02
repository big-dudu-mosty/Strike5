import { CheckCircle2, ExternalLink, Loader2, Plus, Wallet } from 'lucide-react';
import { useState } from 'react';
import { PREDICT_CONFIG } from '../../config/predict';
import { parseDUsdcInput } from '../../lib/dusdc';
import { formatDUsdc, scaleQuoteAsset } from '../../lib/formatters';
import { useI18n } from '../../lib/i18n/I18nProvider';
import type { PredictAccountOverview } from '../../hooks/usePredictAccountOverview';

interface AccountPanelProps {
  overview: PredictAccountOverview;
}

export function AccountPanel({ overview }: AccountPanelProps) {
  const { t } = useI18n();
  const [depositAmount, setDepositAmount] = useState('');
  const {
    address,
    createdManagerHint,
    createManagerMutation,
    currentNetwork,
    currentWallet,
    depositDUsdcMutation,
    isExpectedNetwork,
    managerId,
    managerSource,
    managerSummary,
    managerSummaryQuery,
    walletBalanceQuery,
    walletDUsdcBalance,
    walletDUsdcBalanceRaw,
  } = overview;
  const depositAmountRaw = parseDUsdcInput(depositAmount);
  const isDepositInputEmpty = depositAmount.trim() === '';
  const isDepositAmountInvalid = !isDepositInputEmpty && depositAmountRaw == null;
  const isDepositInsufficient =
    depositAmountRaw != null && walletDUsdcBalanceRaw != null && depositAmountRaw > walletDUsdcBalanceRaw;
  const isDepositDisabled =
    !isExpectedNetwork ||
    !managerId ||
    walletBalanceQuery.isLoading ||
    walletDUsdcBalanceRaw == null ||
    depositDUsdcMutation.isPending ||
    isDepositInputEmpty ||
    isDepositAmountInvalid ||
    isDepositInsufficient;

  return (
    <section className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{t('account.title')}</h2>
          <p className="text-sm text-zinc-500">{t('account.subtitle')}</p>
        </div>
        <Wallet className="h-5 w-5 text-emerald-300" aria-hidden="true" />
      </div>

      {!address ? (
        <div className="mt-4 rounded-md border border-dashed border-zinc-700 p-4 text-sm text-zinc-500">
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

          <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm text-zinc-400">{t('account.manager')}</div>
                <div className="mt-1 text-sm font-medium text-zinc-100">
                  {managerId ? truncateAddress(managerId) : t('account.managerMissing')}
                </div>
              </div>
              {managerId ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-300" aria-hidden="true" />
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
                className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-emerald-400 px-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
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

            {managerId ? (
              <form
                className="mt-4 border-t border-zinc-800 pt-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!depositAmountRaw || isDepositDisabled) return;

                  void overview.depositDUsdc(depositAmountRaw).then(() => {
                    setDepositAmount('');
                  });
                }}
              >
                <label className="text-sm text-zinc-400" htmlFor="dusdc-deposit-amount">
                  {t('account.depositAmount')}
                </label>
                <div className="mt-2 flex gap-2">
                  <input
                    className="min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-emerald-400"
                    id="dusdc-deposit-amount"
                    inputMode="decimal"
                    onChange={(event) => setDepositAmount(event.target.value)}
                    placeholder={t('account.depositPlaceholder')}
                    type="text"
                    value={depositAmount}
                  />
                  <button
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-emerald-400 px-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
                    disabled={isDepositDisabled}
                    type="submit"
                  >
                    {depositDUsdcMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : null}
                    {depositDUsdcMutation.isPending
                      ? t('account.depositing')
                      : t('account.depositButton')}
                  </button>
                </div>
                <div className="mt-2 text-xs text-zinc-500">{t('account.depositNote')}</div>
                {isDepositAmountInvalid ? (
                  <div className="mt-2 text-xs text-red-300">{t('account.depositInvalid')}</div>
                ) : null}
                {isDepositInsufficient ? (
                  <div className="mt-2 text-xs text-red-300">
                    {t('account.depositInsufficient')}
                  </div>
                ) : null}
              </form>
            ) : null}

            {createdManagerHint ? (
              <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t('account.lastTx')}</span>
                <span className="font-mono">{truncateAddress(createdManagerHint.digest)}</span>
              </div>
            ) : null}

            {createManagerMutation.error ? (
              <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                {createManagerMutation.error.message}
              </div>
            ) : null}

            {depositDUsdcMutation.error ? (
              <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                {depositDUsdcMutation.error.message}
              </div>
            ) : null}

            {!isExpectedNetwork ? (
              <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
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
      <span className="text-zinc-500">{label}</span>
      <span
        className={
          tone === 'ok'
            ? 'font-medium text-emerald-300'
            : tone === 'warn'
              ? 'font-medium text-amber-300'
              : 'font-medium text-zinc-200'
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
