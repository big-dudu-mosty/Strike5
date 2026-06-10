import { ArrowDown, ArrowUp, CheckCircle2, Clock3, Plus, ScanLine, Trophy } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PRODUCT_TIMING } from '../../config/predict';
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
  const roundTimeLeft = activeOracle ? formatDuration(activeOracle.expiry - now) : t('marketPulse.pending');
  const roundExpiry = activeOracle ? formatTime(activeOracle.expiry) : t('marketPulse.pending');

  return (
    <section className="rounded-3xl border border-ink-700/60 glass p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-cream-100">{t('trade.title')}</h2>
          <p className="text-sm text-cream-600">{t('trade.subtitle')}</p>
        </div>
        <Trophy className="mt-0.5 h-5 w-5 text-brass-300" aria-hidden="true" />
      </div>

      <div className="mt-4 rounded-xl border border-brass-400/25 bg-brass-400/10 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brass-400 text-ink-950">
              <Clock3 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="text-xs font-medium uppercase tracking-normal text-brass-200/70">
                {t('trade.round.label')}
              </div>
              <div className="mt-1 truncate text-sm font-semibold text-cream-100">
                {activeOracle ? `BTC ${roundExpiry}` : t('trade.round.noOracle')}
              </div>
            </div>
          </div>
          <span className="flex shrink-0 items-center gap-1.5">
            {hasJoinedCurrentRound ? (
              <span className="inline-flex items-center gap-1 rounded bg-brass-400/15 px-2 py-1 text-xs font-semibold text-brass-200">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                {t('trade.round.joined')}
              </span>
            ) : null}
            <span
              className={`rounded px-2 py-1 text-xs font-semibold ${
                activeOracle && !isOpeningCutoff
                  ? 'bg-brass-400 text-ink-950'
                  : 'bg-ink-800 text-cream-300'
              }`}
            >
              {roundStatus}
            </span>
          </span>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-brass-200/60">{t('trade.round.timeLeft')}</dt>
            <dd className="mt-1 font-medium text-cream-100">{roundTimeLeft}</dd>
          </div>
          <div>
            <dt className="text-xs text-brass-200/60">{t('trade.round.expiry')}</dt>
            <dd className="mt-1 font-medium text-cream-100">{roundExpiry}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex rounded-full border border-ink-700/60 bg-ink-950/60 p-1 text-xs font-semibold">
          {(['quick', 'custom'] as const).map((mode) => (
            <button
              className={`h-8 rounded-full px-3.5 transition ${
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
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1 rounded-2xl border border-ink-700/60 bg-ink-950/60 p-1">
        {challengeCards.map((pick) => {
          const Icon = pick.icon;
          const isSelected = pick.kind === selectedKind;
          return (
            <button
              className={`inline-flex h-11 items-center justify-center gap-1.5 rounded-xl text-sm font-bold transition ${
                isSelected
                  ? pick.kind === 'above'
                    ? 'bg-moss-400 text-ink-950'
                    : pick.kind === 'below'
                      ? 'bg-clay-400 text-ink-950'
                      : 'bg-brass-400 text-ink-950'
                  : 'text-cream-500 hover:text-cream-100'
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
      <div className="mt-2 px-1 text-xs text-cream-600">{t(selectedPick.labelKey)}</div>

      <div className="mt-3">
        <div className="rounded-2xl border border-ink-700/60 bg-ink-950/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-cream-600" htmlFor="trade-quantity">
              {t('trade.quantity')}
            </label>
            <span className="text-xs font-semibold text-cream-500">dUSDC</span>
          </div>
          <input
            className="mt-1 w-full bg-transparent text-3xl font-bold tracking-tight text-cream-100 outline-none placeholder:text-cream-700"
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
                    ? 'bg-cream-100 text-ink-950'
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
        <div className="mt-2 px-1 text-xs text-cream-600">
          {quoteRequest
            ? `${t(selectedPick.typeKey)} · ${formatInstrument(quoteRequest)}`
            : isQuantityEmpty
              ? t('trade.waitingQuantity')
              : t('trade.waitingMarket')}
        </div>

        {tradeMode === 'custom' ? (
          <div className="mt-4 grid gap-3">
            {selectedKind === 'range' ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm text-cream-500" htmlFor="trade-lower-strike">
                  {t('trade.lowerStrike')}
                  <input
                    className="mt-2 h-10 w-full rounded-xl border border-ink-600 bg-ink-900 px-3 text-sm text-cream-100 outline-none transition placeholder:text-cream-700 focus:border-brass-400"
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
                    className="mt-2 h-10 w-full rounded-xl border border-ink-600 bg-ink-900 px-3 text-sm text-cream-100 outline-none transition placeholder:text-cream-700 focus:border-brass-400"
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
                  className="mt-2 h-10 w-full rounded-xl border border-ink-600 bg-ink-900 px-3 text-sm text-cream-100 outline-none transition placeholder:text-cream-700 focus:border-brass-400"
                  id="trade-custom-strike"
                  inputMode="decimal"
                  onChange={(event) => setCustomStrikeInput(event.target.value)}
                  placeholder={t('trade.strikePlaceholder')}
                  type="text"
                  value={customStrikeInput}
                />
              </label>
            )}
            <div className="rounded-xl border border-dashed border-ink-600 p-3 text-xs text-cream-600">
              {t('trade.customSnapNote')}
            </div>
          </div>
        ) : null}

        <div className="mt-4 grid gap-2 text-sm">
          <QuoteRow label={t('trade.cost')} value={formatDUsdcRaw(tradeQuote.data?.cost)} />
          <QuoteRow
            label={t('trade.maxPayout')}
            value={formatDUsdcRaw(tradeQuote.data?.maxPayout)}
          />
          <QuoteRow
            label={t('trade.liveRedeem')}
            value={formatDUsdcRaw(tradeQuote.data?.liveRedeem)}
          />
          <QuoteRow label={t('trade.maxLoss')} value={formatDUsdcRaw(tradeQuote.data?.cost)} />
        </div>

        {tradeQuote.isLoading ? (
          <div className="mt-3 text-sm text-cream-600">{t('trade.quoteLoading')}</div>
        ) : null}
        {tradeQuote.error ? (
          <div className="mt-3 rounded-xl border border-clay-400/40 bg-clay-400/10 p-3 text-sm text-clay-200">
            {tradeQuote.error.message}
          </div>
        ) : null}
        {isQuantityInvalid ? (
          <div className="mt-3 text-sm text-clay-300">{t('trade.quantityInvalid')}</div>
        ) : null}
        {customValidationMessage ? (
          <div className="mt-3 text-sm text-clay-300">{customValidationMessage}</div>
        ) : null}
        {isOpeningCutoff ? (
          <div className="mt-3 text-sm text-amber-200">{t('trade.openingCutoff')}</div>
        ) : null}
        {managerTopUpAmount > 0n && !isWalletBalanceInsufficientForTopUp ? (
          <div className="mt-3 rounded-xl border border-brass-400/30 bg-brass-400/10 p-3">
            <div className="text-sm font-medium text-brass-200">
              {t('trade.autoTopUp')} {formatDUsdcRaw(managerTopUpAmount)}
            </div>
            <div className="mt-1 text-xs text-brass-200/70">{t('trade.autoTopUpNote')}</div>
          </div>
        ) : null}
        {isWalletBalanceInsufficientForTopUp ? (
          <div className="mt-3 text-sm text-clay-300">{t('trade.insufficientWalletBalance')}</div>
        ) : null}
        {!accountOverview.managerId ? (
          <div className="mt-3 text-sm text-amber-200">{t('trade.managerRequired')}</div>
        ) : null}
        {isManagerBalanceUnavailable ? (
          <div className="mt-3 text-sm text-amber-200">{t('trade.managerBalanceLoading')}</div>
        ) : null}

        <button
          className="mt-4 h-12 w-full rounded-2xl bg-cream-100 px-3 text-sm font-bold text-ink-950 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-ink-800 disabled:text-cream-600"
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
          {tradeMint.isPending
            ? t('trade.minting')
            : `${t('trade.mintButton')} ${t(selectedPick.typeKey)}`}
        </button>

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

        {streakAppendError === 'order' ? (
          <div className="mt-2 text-xs text-amber-200">{t('trade.combo.order')}</div>
        ) : null}

        {tradeMint.error ? (
          <div className="mt-3 rounded-xl border border-clay-400/40 bg-clay-400/10 p-3 text-sm text-clay-200">
            {formatTradeMintError(tradeMint.error, t)}
          </div>
        ) : null}
        {tradeMint.data ? (
          <div className="mt-3 rounded-xl border border-moss-400/30 bg-moss-400/10 p-3 text-sm text-moss-200">
            <TransactionLink digest={tradeMint.data.digest} label={t('trade.mintSuccess')} />
          </div>
        ) : null}
      </div>

      <div className="mt-4 rounded-xl border border-dashed border-ink-600 p-3 text-sm text-cream-600">
        {t('trade.quoteNote')}
      </div>
    </section>
  );
}

function QuoteRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-cream-600">{label}</span>
      <span className="font-medium text-cream-100">{value}</span>
    </div>
  );
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
