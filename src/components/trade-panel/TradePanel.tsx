import { ArrowDown, ArrowUp, ScanLine } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PRODUCT_TIMING } from '../../config/predict';
import type { PredictAccountOverview } from '../../hooks/usePredictAccountOverview';
import { useTradeMint } from '../../hooks/useTradeMint';
import { useTradeQuote } from '../../hooks/useTradeQuote';
import { useNow } from '../../hooks/useNow';
import { parseDUsdcInput } from '../../lib/dusdc';
import type { TradeKind, TradeQuoteRequest } from '../../lib/deepbook/quote';
import { formatDUsdcRaw, formatUsd } from '../../lib/formatters';
import { useI18n } from '../../lib/i18n/I18nProvider';
import type { MessageKey } from '../../lib/i18n/types';
import type { PredictMarketOverview } from '../../lib/predict-server/types';

const quickPicks = [
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
  onQuoteRequestChange: (request: TradeQuoteRequest | null) => void;
  overview: PredictMarketOverview | undefined;
}

const DEFAULT_QUANTITY = '1';
const RANGE_WIDTH_USD = 100n;
const ORACLE_PRICE_SCALE = 1_000_000_000n;

export function TradePanel({ accountOverview, onQuoteRequestChange, overview }: TradePanelProps) {
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
  const tradeQuote = useTradeQuote(isOpeningCutoff ? null : quoteRequest);
  const tradeMint = useTradeMint({ managerId: accountOverview.managerId });
  const selectedPick = quickPicks.find((pick) => pick.kind === selectedKind) ?? quickPicks[0];
  const managerBalanceRaw =
    accountOverview.managerSummary?.trading_balance == null
      ? null
      : BigInt(Math.max(0, accountOverview.managerSummary.trading_balance));
  const managerTopUpAmount =
    tradeQuote.data?.cost != null && managerBalanceRaw != null && tradeQuote.data.cost > managerBalanceRaw
      ? tradeQuote.data.cost - managerBalanceRaw
      : 0n;
  const isWalletBalanceUnavailableForTopUp =
    managerTopUpAmount > 0n && accountOverview.walletDUsdcBalanceRaw == null;
  const isWalletBalanceInsufficientForTopUp =
    managerTopUpAmount > 0n &&
    accountOverview.walletDUsdcBalanceRaw != null &&
    managerTopUpAmount > accountOverview.walletDUsdcBalanceRaw;
  const isManagerBalanceUnavailable =
    Boolean(accountOverview.managerId) && managerBalanceRaw == null;
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

  return (
    <section className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
      <div>
        <h2 className="text-base font-semibold">{t('trade.title')}</h2>
        <p className="text-sm text-zinc-500">{t('trade.subtitle')}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 rounded-md border border-zinc-800 bg-zinc-950 p-1">
        <button
          className={`h-9 rounded px-3 text-sm font-medium transition ${
            tradeMode === 'quick'
              ? 'bg-emerald-400 text-zinc-950'
              : 'text-zinc-400 hover:text-zinc-100'
          }`}
          onClick={() => setTradeMode('quick')}
          type="button"
        >
          {t('trade.mode.quick')}
        </button>
        <button
          className={`h-9 rounded px-3 text-sm font-medium transition ${
            tradeMode === 'custom'
              ? 'bg-emerald-400 text-zinc-950'
              : 'text-zinc-400 hover:text-zinc-100'
          }`}
          onClick={() => setTradeMode('custom')}
          type="button"
        >
          {t('trade.mode.custom')}
        </button>
      </div>

      <div className="mt-4 grid gap-3">
        {quickPicks.map((pick) => {
          const Icon = pick.icon;
          const isSelected = pick.kind === selectedKind;
          return (
            <button
              className={`flex items-center gap-3 rounded-md border p-3 text-left transition ${
                isSelected
                  ? 'border-emerald-400 bg-emerald-400/10'
                  : 'border-zinc-800 bg-zinc-950 hover:border-emerald-500/60'
              }`}
              key={pick.kind}
              onClick={() => setSelectedKind(pick.kind)}
              type="button"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
                  isSelected ? 'bg-emerald-400 text-zinc-950' : 'bg-zinc-800 text-emerald-300'
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-zinc-100">
                  {t(pick.typeKey)}
                </span>
                <span className="mt-0.5 block text-sm text-zinc-500">{t(pick.labelKey)}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-md border border-zinc-800 bg-zinc-950 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-zinc-100">
              {t(selectedPick.typeKey)} {t('trade.preview')}
            </div>
            <div className="mt-1 text-sm text-zinc-500">
              {quoteRequest ? formatInstrument(quoteRequest) : t('trade.waitingMarket')}
            </div>
          </div>
        </div>

        <label className="mt-4 block text-sm text-zinc-400" htmlFor="trade-quantity">
          {t('trade.quantity')}
        </label>
        <input
          className="mt-2 h-10 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-emerald-400"
          id="trade-quantity"
          inputMode="decimal"
          onChange={(event) => setQuantityInput(event.target.value)}
          placeholder={t('trade.quantityPlaceholder')}
          type="text"
          value={quantityInput}
        />

        {tradeMode === 'custom' ? (
          <div className="mt-4 grid gap-3">
            {selectedKind === 'range' ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm text-zinc-400" htmlFor="trade-lower-strike">
                  {t('trade.lowerStrike')}
                  <input
                    className="mt-2 h-10 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-emerald-400"
                    id="trade-lower-strike"
                    inputMode="decimal"
                    onChange={(event) => setCustomLowerStrikeInput(event.target.value)}
                    placeholder={t('trade.strikePlaceholder')}
                    type="text"
                    value={customLowerStrikeInput}
                  />
                </label>
                <label className="block text-sm text-zinc-400" htmlFor="trade-higher-strike">
                  {t('trade.higherStrike')}
                  <input
                    className="mt-2 h-10 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-emerald-400"
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
              <label className="block text-sm text-zinc-400" htmlFor="trade-custom-strike">
                {t('trade.strike')}
                <input
                  className="mt-2 h-10 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-emerald-400"
                  id="trade-custom-strike"
                  inputMode="decimal"
                  onChange={(event) => setCustomStrikeInput(event.target.value)}
                  placeholder={t('trade.strikePlaceholder')}
                  type="text"
                  value={customStrikeInput}
                />
              </label>
            )}
            <div className="rounded-md border border-dashed border-zinc-700 p-3 text-xs text-zinc-500">
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
          <div className="mt-3 text-sm text-zinc-500">{t('trade.quoteLoading')}</div>
        ) : null}
        {tradeQuote.error ? (
          <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {tradeQuote.error.message}
          </div>
        ) : null}
        {isQuantityInvalid ? (
          <div className="mt-3 text-sm text-red-300">{t('trade.quantityInvalid')}</div>
        ) : null}
        {customValidationMessage ? (
          <div className="mt-3 text-sm text-red-300">{customValidationMessage}</div>
        ) : null}
        {isOpeningCutoff ? (
          <div className="mt-3 text-sm text-amber-200">{t('trade.openingCutoff')}</div>
        ) : null}
        {managerTopUpAmount > 0n && !isWalletBalanceInsufficientForTopUp ? (
          <div className="mt-3 text-sm text-emerald-200">
            {t('trade.autoTopUp')} {formatDUsdcRaw(managerTopUpAmount)}
          </div>
        ) : null}
        {isWalletBalanceInsufficientForTopUp ? (
          <div className="mt-3 text-sm text-red-300">{t('trade.insufficientWalletBalance')}</div>
        ) : null}
        {!accountOverview.managerId ? (
          <div className="mt-3 text-sm text-amber-200">{t('trade.managerRequired')}</div>
        ) : null}
        {isManagerBalanceUnavailable ? (
          <div className="mt-3 text-sm text-amber-200">{t('trade.managerBalanceLoading')}</div>
        ) : null}

        <button
          className="mt-4 h-10 w-full rounded-md bg-emerald-400 px-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-400"
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

        {tradeMint.error ? (
          <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {tradeMint.error.message}
          </div>
        ) : null}
        {tradeMint.data ? (
          <div className="mt-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
            {t('trade.mintSuccess')}{' '}
            <span className="font-mono">{truncateDigest(tradeMint.data.digest)}</span>
          </div>
        ) : null}
      </div>

      <div className="mt-4 rounded-md border border-dashed border-zinc-700 p-3 text-sm text-zinc-500">
        {t('trade.quoteNote')}
      </div>
    </section>
  );
}

function QuoteRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-zinc-500">{label}</span>
      <span className="font-medium text-zinc-100">{value}</span>
    </div>
  );
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

function truncateDigest(digest: string) {
  return `${digest.slice(0, 8)}...${digest.slice(-6)}`;
}
