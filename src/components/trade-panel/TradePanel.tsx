import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clock3,
  Loader2,
  Plus,
  ScanLine,
  ShieldCheck,
  Trophy,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { PREDICT_CONFIG, PRODUCT_TIMING } from '../../config/predict';
import type { PredictAccountOverview } from '../../hooks/usePredictAccountOverview';
import { usePredictPositions } from '../../hooks/usePredictPositions';
import { useTradeMint } from '../../hooks/useTradeMint';
import { useTradeQuote } from '../../hooks/useTradeQuote';
import { useNow } from '../../hooks/useNow';
import {
  STREAK_TARGET,
  createArenaComboLeg,
  getStreakAppendError,
  isStreakTerminal,
  type ArenaComboLeg,
} from '../../lib/combo';
import { parseDUsdcInput } from '../../lib/dusdc';
import type { TradeKind, TradeQuoteRequest } from '../../lib/deepbook/quote';
import { formatDUsdcRaw, formatDuration, formatTime, formatUsd } from '../../lib/formatters';
import { useI18n } from '../../lib/i18n/I18nProvider';
import type { MessageKey } from '../../lib/i18n/types';
import type { PredictMarketOverview } from '../../lib/predict-server/types';
import { TransactionLink } from '../transaction/TransactionLink';

const challengeCards = [
  {
    kind: 'above',
    typeKey: 'trade.above',
    labelKey: 'trade.above.label',
    icon: ArrowUp,
  },
  {
    kind: 'below',
    typeKey: 'trade.below',
    labelKey: 'trade.below.label',
    icon: ArrowDown,
  },
  {
    kind: 'range',
    typeKey: 'trade.range',
    labelKey: 'trade.range.label',
    icon: ScanLine,
  },
] satisfies Array<{
  kind: TradeKind;
  typeKey: MessageKey;
  labelKey: MessageKey;
  icon: typeof ArrowUp;
}>;

type TradeMode = 'quick' | 'custom';

interface TradePanelProps {
  accountOverview: PredictAccountOverview;
  onAddComboLeg: (leg: ArenaComboLeg) => void;
  onQuoteRequestChange: (request: TradeQuoteRequest | null) => void;
  overview: PredictMarketOverview | undefined;
  streakLegs: ArenaComboLeg[];
}

const DEFAULT_QUANTITY = '';
const RANGE_WIDTH_USD = 100n;
const ORACLE_PRICE_SCALE = 1_000_000_000n;

export function TradePanel({
  accountOverview,
  onAddComboLeg,
  onQuoteRequestChange,
  overview,
  streakLegs,
}: TradePanelProps) {
  const { t } = useI18n();
  const now = useNow();
  const [tradeMode, setTradeMode] = useState<TradeMode>('quick');
  const [selectedKind, setSelectedKind] = useState<TradeKind>('above');
  const [customHigherStrikeInput, setCustomHigherStrikeInput] = useState('');
  const [customLowerStrikeInput, setCustomLowerStrikeInput] = useState('');
  const [customSeedOracleId, setCustomSeedOracleId] = useState<string | null>(null);
  const [customStrikeInput, setCustomStrikeInput] = useState('');
  const [quantityInput, setQuantityInput] = useState(DEFAULT_QUANTITY);
  const quantity = parseDUsdcInput(quantityInput);
  const activeOracle = overview?.activeOracle ?? null;
  const oracleSpot = overview?.oracleState?.latest_price?.spot ?? null;
  useEffect(() => {
    if (!activeOracle || oracleSpot == null || customSeedOracleId === activeOracle.oracle_id) {
      return;
    }

    const tickSize = BigInt(activeOracle.tick_size);
    const minStrike = BigInt(activeOracle.min_strike);
    const snappedSpot = snapToTick(BigInt(oracleSpot), minStrike, tickSize);
    const lowerStrike = snapToTick(snappedSpot - RANGE_WIDTH_USD * ORACLE_PRICE_SCALE, minStrike, tickSize);
    const higherStrike = snapToTick(snappedSpot + RANGE_WIDTH_USD * ORACLE_PRICE_SCALE, minStrike, tickSize);

    setCustomStrikeInput(formatRawStrikeInput(snappedSpot));
    setCustomLowerStrikeInput(formatRawStrikeInput(lowerStrike));
    setCustomHigherStrikeInput(
      formatRawStrikeInput(higherStrike > lowerStrike ? higherStrike : lowerStrike + tickSize),
    );
    setCustomSeedOracleId(activeOracle.oracle_id);
  }, [activeOracle, customSeedOracleId, oracleSpot]);
  const customQuoteBuild = useMemo(() => {
    if (!activeOracle || !quantity) {
      return {
        errorKey: null,
        request: null,
      };
    }

    return buildCustomQuoteRequest({
      expiry: BigInt(activeOracle.expiry),
      higherStrikeInput: customHigherStrikeInput,
      kind: selectedKind,
      lowerStrikeInput: customLowerStrikeInput,
      minStrike: BigInt(activeOracle.min_strike),
      oracleId: activeOracle.oracle_id,
      quantity,
      strikeInput: customStrikeInput,
      tickSize: BigInt(activeOracle.tick_size),
    });
  }, [
    activeOracle,
    customHigherStrikeInput,
    customLowerStrikeInput,
    customStrikeInput,
    quantity,
    selectedKind,
  ]);
  const quoteRequest = useMemo(() => {
    if (!activeOracle || oracleSpot == null || !quantity) return null;
    if (tradeMode === 'custom') return customQuoteBuild.request;

    return buildQuickPickQuoteRequest({
      kind: selectedKind,
      oracleId: activeOracle.oracle_id,
      expiry: BigInt(activeOracle.expiry),
      minStrike: BigInt(activeOracle.min_strike),
      oracleSpot: BigInt(oracleSpot),
      quantity,
      tickSize: BigInt(activeOracle.tick_size),
    });
  }, [activeOracle, customQuoteBuild.request, oracleSpot, quantity, selectedKind, tradeMode]);
  useEffect(() => {
    onQuoteRequestChange(quoteRequest);

    return () => onQuoteRequestChange(null);
  }, [onQuoteRequestChange, quoteRequest]);
  const timeLeftMs = activeOracle ? activeOracle.expiry - now : null;
  const isOpeningCutoff =
    timeLeftMs != null && timeLeftMs <= PRODUCT_TIMING.openingCutoffMs;
  const positions = usePredictPositions(accountOverview.managerId);
  const hasJoinedCurrentRound = Boolean(
    activeOracle &&
      positions.data?.rows.some(
        (row) => row.oracleId === activeOracle.oracle_id && row.openQuantity > 0,
      ),
  );
  const tradeQuote = useTradeQuote(isOpeningCutoff ? null : quoteRequest);
  const tradeMint = useTradeMint({ managerId: accountOverview.managerId });
  const selectedPick =
    challengeCards.find((pick) => pick.kind === selectedKind) ?? challengeCards[0];
  const managerBalanceRaw =
    accountOverview.managerSummary?.trading_balance == null
      ? null
      : BigInt(Math.max(0, accountOverview.managerSummary.trading_balance));
  const managerReserveTarget = tradeQuote.data?.maxPayout ?? 0n;
  const managerTopUpAmount =
    managerReserveTarget > 0n && managerBalanceRaw != null && managerReserveTarget > managerBalanceRaw
      ? managerReserveTarget - managerBalanceRaw
      : 0n;
  const isWalletBalanceUnavailableForTopUp =
    managerTopUpAmount > 0n && accountOverview.walletDUsdcBalanceRaw == null;
  const isWalletBalanceInsufficientForTopUp =
    managerTopUpAmount > 0n &&
    accountOverview.walletDUsdcBalanceRaw != null &&
    managerTopUpAmount > accountOverview.walletDUsdcBalanceRaw;
  const isManagerBalanceUnavailable =
    Boolean(accountOverview.managerId) && managerBalanceRaw == null;
  const isQuantityEmpty = quantityInput.trim() === '';
  const isQuantityInvalid = quantityInput.trim() !== '' && quantity == null;
  const customValidationMessage =
    tradeMode === 'custom' && customQuoteBuild.errorKey ? t(customQuoteBuild.errorKey) : null;
  const isMintDisabled =
    !accountOverview.isExpectedNetwork ||
    !accountOverview.managerId ||
    isManagerBalanceUnavailable ||
    isWalletBalanceUnavailableForTopUp ||
    isWalletBalanceInsufficientForTopUp ||
    isOpeningCutoff ||
    isQuantityInvalid ||
    !quoteRequest ||
    !tradeQuote.data ||
    tradeQuote.isLoading ||
    tradeQuote.isError ||
    tradeMint.isPending;
  const streakAppendError = quoteRequest
    ? getStreakAppendError(streakLegs, {
        expiry: quoteRequest.expiry,
        oracleId: quoteRequest.oracleId,
      })
    : null;
  const isStreakFull = !isStreakTerminal(streakLegs) && streakLegs.length >= STREAK_TARGET;
  const isComboAddDisabled =
    !quoteRequest ||
    !tradeQuote.data ||
    tradeQuote.isLoading ||
    tradeQuote.isError ||
    isStreakFull ||
    streakAppendError === 'order';
  const roundStatus = !activeOracle
    ? t('trade.round.noOracle')
    : isOpeningCutoff
      ? t('trade.round.closed')
      : t('trade.round.open');
  const roundTimeLeft = activeOracle ? formatDuration(activeOracle.expiry - now) : '—';
  const roundExpiry = activeOracle ? formatTime(activeOracle.expiry) : '—';
  const quoteFallback = isQuantityEmpty
    ? t('trade.estimateAfterStake')
    : tradeQuote.isLoading
      ? t('trade.estimating')
      : '—';
  const mintDisabledReason = isMintDisabled
    ? getMintDisabledReason({
        accountOverview,
        isManagerBalanceUnavailable,
        isOpeningCutoff,
        isQuantityEmpty,
        isQuantityInvalid,
        isWalletBalanceInsufficientForTopUp,
        isWalletBalanceUnavailableForTopUp,
        quoteRequest,
        t,
        tradeMintPending: tradeMint.isPending,
        tradeQuoteHasData: Boolean(tradeQuote.data),
        tradeQuoteIsError: tradeQuote.isError,
        tradeQuoteIsLoading: tradeQuote.isLoading,
      })
    : null;
  const comboDisabledReason = isComboAddDisabled
    ? getComboDisabledReason({
        isQuantityEmpty,
        isStreakFull,
        quoteRequest,
        streakAppendError,
        t,
        tradeQuoteHasData: Boolean(tradeQuote.data),
        tradeQuoteIsError: tradeQuote.isError,
        tradeQuoteIsLoading: tradeQuote.isLoading,
      })
    : null;

  return (
    <section className="overflow-hidden rounded-3xl border border-ink-700/70 bg-ink-900/90 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
      <div className="flex items-start justify-between gap-3 border-b border-ink-700/60 px-5 py-4">
        <div>
          <h2 className="font-display text-[17px] font-semibold text-cream-100">
            {t('trade.title')}
          </h2>
          <p className="mt-0.5 text-sm text-cream-600">{t('trade.subtitle')}</p>
        </div>
        <Trophy className="mt-0.5 h-5 w-5 text-brass-300" aria-hidden="true" />
      </div>

      <TradePanelSection title={t('trade.section.round')}>
        <div className="rounded-2xl border border-ink-700/60 bg-ink-950/55 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brass-400 text-ink-950">
                <Clock3 className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cream-700">
                  {t('trade.round.label')}
                </div>
                <div className="mt-1 truncate text-base font-semibold text-cream-100">
                  {activeOracle ? `BTC ${roundExpiry}` : t('trade.round.noOracle')}
                </div>
              </div>
            </div>
            <span className="flex shrink-0 flex-col items-end gap-1.5">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  activeOracle && !isOpeningCutoff
                    ? 'bg-moss-400/15 text-moss-300'
                    : 'bg-ink-800 text-cream-400'
                }`}
              >
                {roundStatus}
              </span>
              {hasJoinedCurrentRound ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-moss-300">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('trade.round.joined')}
                </span>
              ) : null}
            </span>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-ink-700/50 pt-3">
            <MiniMetric label={t('trade.round.timeLeft')} value={roundTimeLeft} />
            <MiniMetric label={t('trade.round.expiry')} value={roundExpiry} />
          </dl>
        </div>
      </TradePanelSection>

      <TradePanelSection title={t('trade.section.direction')}>
        <div className="flex rounded-full border border-ink-700/60 bg-ink-950/60 p-1 text-xs font-semibold">
          {(['quick', 'custom'] as const).map((mode) => (
            <button
              className={`h-8 flex-1 rounded-full px-3.5 transition ${
                tradeMode === mode
                  ? 'bg-cream-100 text-ink-950'
                  : 'text-cream-500 hover:text-cream-100'
              }`}
              key={mode}
              onClick={() => setTradeMode(mode)}
              type="button"
            >
              {mode === 'quick' ? t('trade.mode.quick') : t('trade.mode.custom')}
            </button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1 rounded-2xl border border-ink-700/60 bg-ink-950/60 p-1">
          {challengeCards.map((pick) => {
            const Icon = pick.icon;
            const isSelected = pick.kind === selectedKind;
            return (
              <button
                className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-bold transition ${
                  isSelected
                    ? 'bg-brass-400 text-ink-950 shadow-[0_0_0_1px_rgba(240,194,75,0.28)]'
                    : 'text-cream-500 hover:bg-ink-800/70 hover:text-cream-100'
                }`}
                key={pick.kind}
                onClick={() => setSelectedKind(pick.kind)}
                type="button"
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {t(pick.typeKey)}
              </button>
            );
          })}
        </div>
        <div className="mt-2 px-1 text-xs leading-5 text-cream-600">{t(selectedPick.labelKey)}</div>

        {tradeMode === 'custom' ? (
          <div className="mt-4 grid gap-3 border-t border-ink-700/50 pt-4">
            {selectedKind === 'range' ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm text-cream-500" htmlFor="trade-lower-strike">
                  {t('trade.lowerStrike')}
                  <input
                    className="mt-2 h-10 w-full rounded-xl border border-ink-600 bg-ink-950/70 px-3 text-sm text-cream-100 outline-none transition placeholder:text-cream-700 focus:border-brass-400"
                    id="trade-lower-strike"
                    inputMode="decimal"
                    onChange={(event) => setCustomLowerStrikeInput(event.target.value)}
                    placeholder={t('trade.strikePlaceholder')}
                    type="text"
                    value={customLowerStrikeInput}
                  />
                </label>
                <label className="block text-sm text-cream-500" htmlFor="trade-higher-strike">
                  {t('trade.higherStrike')}
                  <input
                    className="mt-2 h-10 w-full rounded-xl border border-ink-600 bg-ink-950/70 px-3 text-sm text-cream-100 outline-none transition placeholder:text-cream-700 focus:border-brass-400"
                    id="trade-higher-strike"
                    inputMode="decimal"
                    onChange={(event) => setCustomHigherStrikeInput(event.target.value)}
                    placeholder={t('trade.strikePlaceholder')}
                    type="text"
                    value={customHigherStrikeInput}
                  />
                </label>
              </div>
            ) : (
              <label className="block text-sm text-cream-500" htmlFor="trade-custom-strike">
                {t('trade.strike')}
                <input
                  className="mt-2 h-10 w-full rounded-xl border border-ink-600 bg-ink-950/70 px-3 text-sm text-cream-100 outline-none transition placeholder:text-cream-700 focus:border-brass-400"
                  id="trade-custom-strike"
                  inputMode="decimal"
                  onChange={(event) => setCustomStrikeInput(event.target.value)}
                  placeholder={t('trade.strikePlaceholder')}
                  type="text"
                  value={customStrikeInput}
                />
              </label>
            )}
            <div className="rounded-xl bg-ink-950/45 p-3 text-xs leading-5 text-cream-600">
              {t('trade.customSnapNote')}
            </div>
          </div>
        ) : null}
      </TradePanelSection>

      <TradePanelSection title={t('trade.section.stake')}>
        <div className="rounded-2xl border border-ink-700/60 bg-ink-950/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <label
              className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cream-700"
              htmlFor="trade-quantity"
            >
              {t('trade.quantity')}
            </label>
            <span className="text-xs font-semibold text-cream-500">dUSDC</span>
          </div>
          <input
            className="mt-1 w-full bg-transparent text-4xl font-bold tracking-tight text-cream-100 outline-none placeholder:text-cream-700 tabular-nums"
            id="trade-quantity"
            inputMode="decimal"
            onChange={(event) => setQuantityInput(event.target.value)}
            placeholder="0.00"
            type="text"
            value={quantityInput}
          />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {['1', '5', '10', '25', '50'].map((preset) => (
              <button
                className={`h-7 rounded-full px-3 text-xs font-semibold transition ${
                  quantityInput === preset
                    ? 'bg-brass-400 text-ink-950'
                    : 'bg-ink-800 text-cream-500 hover:text-cream-100'
                }`}
                key={preset}
                onClick={() => setQuantityInput(preset)}
                type="button"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2 px-1 text-xs leading-5 text-cream-600">
          {quoteRequest
            ? `${t(selectedPick.typeKey)} · ${formatInstrument(quoteRequest)}`
            : isQuantityEmpty
              ? t('trade.estimateAfterStake')
              : t('trade.waitingMarket')}
        </div>
      </TradePanelSection>

      <TradePanelSection title={t('trade.section.preview')}>
        {isQuantityEmpty ? (
          <div className="rounded-2xl bg-ink-950/45 p-4 text-sm leading-6 text-cream-500">
            {t('trade.estimateAfterStake')}
          </div>
        ) : (
          <div className="grid gap-2 rounded-2xl bg-ink-950/45 p-4 text-sm">
            <QuoteRow
              label={t('trade.cost')}
              value={formatQuoteValue(tradeQuote.data?.cost, quoteFallback)}
            />
            <QuoteRow
              label={t('trade.maxPayout')}
              value={formatQuoteValue(tradeQuote.data?.maxPayout, quoteFallback)}
            />
            <QuoteRow
              label={t('trade.liveRedeem')}
              value={formatQuoteValue(tradeQuote.data?.liveRedeem, quoteFallback)}
            />
            <QuoteRow
              label={t('trade.maxLoss')}
              value={formatQuoteValue(tradeQuote.data?.cost, quoteFallback)}
              tone="risk"
            />
          </div>
        )}

        {tradeQuote.isLoading ? (
          <InlineStatus tone="info">{t('trade.quoteLoading')}</InlineStatus>
        ) : null}
        {tradeQuote.error ? (
          <InlineStatus tone="risk">{tradeQuote.error.message}</InlineStatus>
        ) : null}
        {isQuantityInvalid ? (
          <InlineStatus tone="risk">{t('trade.quantityInvalid')}</InlineStatus>
        ) : null}
        {customValidationMessage ? (
          <InlineStatus tone="risk">{customValidationMessage}</InlineStatus>
        ) : null}
        {isOpeningCutoff ? (
          <InlineStatus tone="warn">{t('trade.openingCutoff')}</InlineStatus>
        ) : null}
        {managerTopUpAmount > 0n && !isWalletBalanceInsufficientForTopUp ? (
          <InlineStatus tone="brand">
            <span className="font-semibold">
              {t('trade.autoTopUp')} {formatDUsdcRaw(managerTopUpAmount)}
            </span>
            <span className="mt-1 block text-xs opacity-75">{t('trade.autoTopUpNote')}</span>
          </InlineStatus>
        ) : null}
      </TradePanelSection>

      <TradePanelSection title={t('trade.section.action')}>
        <button
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brass-400 px-3 text-sm font-bold text-ink-950 transition hover:bg-brass-300 disabled:cursor-not-allowed disabled:bg-ink-800 disabled:text-cream-600"
          disabled={isMintDisabled}
          onClick={() => {
            if (!quoteRequest || isMintDisabled) return;
            void tradeMint.mutateAsync({
              managerTopUpAmount,
              request: quoteRequest,
            });
          }}
          type="button"
        >
          {tradeMint.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : null}
          {tradeMint.isPending
            ? t('trade.minting')
            : `${t('trade.mintButton')} ${t(selectedPick.typeKey)}`}
        </button>
        {mintDisabledReason ? (
          <div className="mt-2 rounded-xl bg-ink-950/45 px-3 py-2 text-xs leading-5 text-cream-600">
            {mintDisabledReason}
          </div>
        ) : null}

        <button
          className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-ink-600 px-3 text-sm font-semibold text-cream-200 transition hover:border-brass-400 hover:text-brass-200 disabled:cursor-not-allowed disabled:border-ink-700 disabled:text-cream-700"
          disabled={isComboAddDisabled}
          onClick={() => {
            if (!quoteRequest || !tradeQuote.data || isComboAddDisabled) return;
            onAddComboLeg(createArenaComboLeg(quoteRequest, tradeQuote.data));
          }}
          type="button"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {isStreakFull ? t('trade.combo.full') : t('trade.combo.add')}
        </button>
        {comboDisabledReason ? (
          <div className="mt-2 text-xs leading-5 text-cream-700">{comboDisabledReason}</div>
        ) : null}

        {tradeMint.isPending ? (
          <InlineStatus tone="info">{t('trade.txConfirming')}</InlineStatus>
        ) : null}
        {tradeMint.error ? (
          <InlineStatus tone="risk">{formatTradeMintError(tradeMint.error, t)}</InlineStatus>
        ) : null}
        {tradeMint.data ? (
          <InlineStatus tone="success">
            <TransactionLink digest={tradeMint.data.digest} label={t('trade.mintSuccess')} />
          </InlineStatus>
        ) : null}

        <div className="mt-4 grid gap-2 border-t border-ink-700/50 pt-4 text-xs leading-5 text-cream-600">
          <div className="flex items-center gap-2 text-cream-500">
            <ShieldCheck className="h-4 w-4 text-moss-300" aria-hidden="true" />
            {t('trade.contractVerified')} {truncateAddress(PREDICT_CONFIG.predictPackageId)}
          </div>
          <div>{t('trade.quoteNote')}</div>
        </div>
      </TradePanelSection>
    </section>
  );
}

function TradePanelSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="border-b border-ink-700/45 px-5 py-4 last:border-b-0">
      <h3 className="mb-3 text-[15px] font-semibold text-cream-200">{title}</h3>
      {children}
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-[0.12em] text-cream-700">{label}</dt>
      <dd className="mt-1 truncate text-sm font-semibold text-cream-100 tabular-nums">{value}</dd>
    </div>
  );
}

function QuoteRow({
  label,
  tone = 'default',
  value,
}: {
  label: string;
  tone?: 'default' | 'risk';
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-cream-600">{label}</span>
      <span
        className={`text-right text-sm font-semibold tabular-nums ${
          tone === 'risk' && value.includes('dUSDC') ? 'text-clay-300' : 'text-cream-100'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function InlineStatus({
  children,
  tone,
}: {
  children: ReactNode;
  tone: 'brand' | 'info' | 'risk' | 'success' | 'warn';
}) {
  const cls = {
    brand: 'border-brass-400/25 bg-brass-400/10 text-brass-200',
    info: 'border-ink-600 bg-ink-950/55 text-cream-500',
    risk: 'border-clay-400/35 bg-clay-400/10 text-clay-200',
    success: 'border-moss-400/30 bg-moss-400/10 text-moss-200',
    warn: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
  }[tone];

  return <div className={`mt-3 rounded-xl border p-3 text-sm ${cls}`}>{children}</div>;
}

function formatQuoteValue(value: bigint | null | undefined, fallback: string) {
  return value == null ? fallback : formatDUsdcRaw(value);
}

function formatTradeMintError(error: Error, t: (key: MessageKey) => string) {
  if (error.message === 'STRIKE5_MANAGER_FUNDING_PRECHECK_FAILED') {
    return t('trade.error.managerFunding');
  }

  if (error.message === 'STRIKE5_MINT_PREFLIGHT_FAILED') {
    return t('trade.error.preflight');
  }

  return error.message;
}

function truncateAddress(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function getMintDisabledReason({
  accountOverview,
  isManagerBalanceUnavailable,
  isOpeningCutoff,
  isQuantityEmpty,
  isQuantityInvalid,
  isWalletBalanceInsufficientForTopUp,
  isWalletBalanceUnavailableForTopUp,
  quoteRequest,
  t,
  tradeMintPending,
  tradeQuoteHasData,
  tradeQuoteIsError,
  tradeQuoteIsLoading,
}: {
  accountOverview: PredictAccountOverview;
  isManagerBalanceUnavailable: boolean;
  isOpeningCutoff: boolean;
  isQuantityEmpty: boolean;
  isQuantityInvalid: boolean;
  isWalletBalanceInsufficientForTopUp: boolean;
  isWalletBalanceUnavailableForTopUp: boolean;
  quoteRequest: TradeQuoteRequest | null;
  t: (key: MessageKey) => string;
  tradeMintPending: boolean;
  tradeQuoteHasData: boolean;
  tradeQuoteIsError: boolean;
  tradeQuoteIsLoading: boolean;
}) {
  if (!accountOverview.isExpectedNetwork) return t('trade.disabled.network');
  if (!accountOverview.managerId) return t('trade.managerRequired');
  if (isManagerBalanceUnavailable) return t('trade.managerBalanceLoading');
  if (isWalletBalanceUnavailableForTopUp) return t('trade.disabled.walletBalanceLoading');
  if (isWalletBalanceInsufficientForTopUp) return t('trade.insufficientWalletBalance');
  if (isOpeningCutoff) return t('trade.openingCutoff');
  if (isQuantityInvalid) return t('trade.quantityInvalid');
  if (isQuantityEmpty) return t('trade.estimateAfterStake');
  if (!quoteRequest) return t('trade.waitingMarket');
  if (tradeQuoteIsLoading) return t('trade.quoteLoading');
  if (tradeQuoteIsError || !tradeQuoteHasData) return t('trade.disabled.quoteUnavailable');
  if (tradeMintPending) return t('trade.txConfirming');
  return null;
}

function getComboDisabledReason({
  isQuantityEmpty,
  isStreakFull,
  quoteRequest,
  streakAppendError,
  t,
  tradeQuoteHasData,
  tradeQuoteIsError,
  tradeQuoteIsLoading,
}: {
  isQuantityEmpty: boolean;
  isStreakFull: boolean;
  quoteRequest: TradeQuoteRequest | null;
  streakAppendError: 'full' | 'order' | null;
  t: (key: MessageKey) => string;
  tradeQuoteHasData: boolean;
  tradeQuoteIsError: boolean;
  tradeQuoteIsLoading: boolean;
}) {
  if (isStreakFull) return t('trade.combo.full');
  if (streakAppendError === 'order') return t('trade.combo.order');
  if (isQuantityEmpty || !quoteRequest) return t('trade.combo.needQuote');
  if (tradeQuoteIsLoading) return t('trade.quoteLoading');
  if (tradeQuoteIsError || !tradeQuoteHasData) return t('trade.disabled.quoteUnavailable');
  return null;
}

function buildQuickPickQuoteRequest({
  expiry,
  kind,
  minStrike,
  oracleId,
  oracleSpot,
  quantity,
  tickSize,
}: {
  expiry: bigint;
  kind: TradeKind;
  minStrike: bigint;
  oracleId: string;
  oracleSpot: bigint;
  quantity: bigint;
  tickSize: bigint;
}): TradeQuoteRequest {
  const strike = snapToTick(oracleSpot, minStrike, tickSize);

  if (kind !== 'range') {
    return {
      kind,
      expiry,
      oracleId,
      quantity,
      strike,
    };
  }

  const width = RANGE_WIDTH_USD * ORACLE_PRICE_SCALE;
  const lowerStrike = snapToTick(oracleSpot - width, minStrike, tickSize);
  const higherStrike = snapToTick(oracleSpot + width, minStrike, tickSize);

  return {
    kind,
    expiry,
    higherStrike: higherStrike > lowerStrike ? higherStrike : lowerStrike + tickSize,
    lowerStrike,
    oracleId,
    quantity,
  };
}

function buildCustomQuoteRequest({
  expiry,
  higherStrikeInput,
  kind,
  lowerStrikeInput,
  minStrike,
  oracleId,
  quantity,
  strikeInput,
  tickSize,
}: {
  expiry: bigint;
  higherStrikeInput: string;
  kind: TradeKind;
  lowerStrikeInput: string;
  minStrike: bigint;
  oracleId: string;
  quantity: bigint;
  strikeInput: string;
  tickSize: bigint;
}): { errorKey: MessageKey | null; request: TradeQuoteRequest | null } {
  if (kind !== 'range') {
    const strike = parseOracleUsdInput(strikeInput);
    if (!strike) return { errorKey: 'trade.customStrikeInvalid', request: null };
    if (strike < minStrike) return { errorKey: 'trade.customStrikeBelowMin', request: null };

    return {
      errorKey: null,
      request: {
        kind,
        expiry,
        oracleId,
        quantity,
        strike: snapToTick(strike, minStrike, tickSize),
      },
    };
  }

  const lowerStrike = parseOracleUsdInput(lowerStrikeInput);
  const higherStrike = parseOracleUsdInput(higherStrikeInput);
  if (!lowerStrike || !higherStrike) {
    return { errorKey: 'trade.customRangeInvalid', request: null };
  }
  if (lowerStrike < minStrike || higherStrike < minStrike) {
    return { errorKey: 'trade.customStrikeBelowMin', request: null };
  }

  const snappedLower = snapToTick(lowerStrike, minStrike, tickSize);
  const snappedHigher = snapToTick(higherStrike, minStrike, tickSize);
  if (snappedLower >= snappedHigher) {
    return { errorKey: 'trade.customRangeOrderInvalid', request: null };
  }

  return {
    errorKey: null,
    request: {
      kind,
      expiry,
      higherStrike: snappedHigher,
      lowerStrike: snappedLower,
      oracleId,
      quantity,
    },
  };
}

function parseOracleUsdInput(input: string) {
  const normalized = input.trim().replace(/,/g, '');
  if (!/^\d+(\.\d{0,9})?$/.test(normalized)) return null;

  const [wholePart, fractionPart = ''] = normalized.split('.');
  const whole = BigInt(wholePart);
  const fraction = BigInt(fractionPart.padEnd(9, '0'));
  const value = whole * ORACLE_PRICE_SCALE + fraction;

  return value > 0n ? value : null;
}

function snapToTick(value: bigint, minStrike: bigint, tickSize: bigint) {
  if (value <= minStrike) return minStrike;

  const offset = value - minStrike;
  const lowerOffset = (offset / tickSize) * tickSize;
  const remainder = offset - lowerOffset;
  const roundedOffset = remainder * 2n >= tickSize ? lowerOffset + tickSize : lowerOffset;

  return minStrike + roundedOffset;
}

function formatInstrument(request: TradeQuoteRequest) {
  if (request.kind === 'range') {
    return `${formatRawStrike(request.lowerStrike)} - ${formatRawStrike(request.higherStrike)}`;
  }

  return `${formatRawStrike(request.strike)}`;
}

function formatRawStrike(value: bigint) {
  return formatUsd(Number(value) / Number(ORACLE_PRICE_SCALE), { integer: true });
}

function formatRawStrikeInput(value: bigint) {
  return (Number(value) / Number(ORACLE_PRICE_SCALE)).toFixed(0);
}
