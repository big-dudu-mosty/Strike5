import { ArrowDown, ArrowUp, ScanLine } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PRODUCT_TIMING } from '../../config/predict';
import type { PredictAccountOverview } from '../../hooks/usePredictAccountOverview';
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

interface TradePanelProps {
  accountOverview: PredictAccountOverview;
  overview: PredictMarketOverview | undefined;
}

const DEFAULT_QUANTITY = '1';
const RANGE_WIDTH_USD = 100n;
const ORACLE_PRICE_SCALE = 1_000_000_000n;

export function TradePanel({ accountOverview, overview }: TradePanelProps) {
  const { t } = useI18n();
  const now = useNow();
  const [selectedKind, setSelectedKind] = useState<TradeKind>('above');
  const [quantityInput, setQuantityInput] = useState(DEFAULT_QUANTITY);
  const quantity = parseDUsdcInput(quantityInput);
  const activeOracle = overview?.activeOracle ?? null;
  const oracleSpot = overview?.oracleState?.latest_price?.spot ?? null;
  const quoteRequest = useMemo(() => {
    if (!activeOracle || oracleSpot == null || !quantity) return null;

    return buildQuickPickQuoteRequest({
      kind: selectedKind,
      oracleId: activeOracle.oracle_id,
      expiry: BigInt(activeOracle.expiry),
      minStrike: BigInt(activeOracle.min_strike),
      oracleSpot: BigInt(oracleSpot),
      quantity,
      tickSize: BigInt(activeOracle.tick_size),
    });
  }, [activeOracle, oracleSpot, quantity, selectedKind]);
  const timeLeftMs = activeOracle ? activeOracle.expiry - now : null;
  const isOpeningCutoff =
    timeLeftMs != null && timeLeftMs <= PRODUCT_TIMING.openingCutoffMs;
  const tradeQuote = useTradeQuote(isOpeningCutoff ? null : quoteRequest);
  const selectedPick = quickPicks.find((pick) => pick.kind === selectedKind) ?? quickPicks[0];
  const managerBalanceRaw =
    accountOverview.managerSummary?.trading_balance == null
      ? null
      : BigInt(Math.max(0, accountOverview.managerSummary.trading_balance));
  const isManagerBalanceInsufficient =
    tradeQuote.data?.cost != null &&
    managerBalanceRaw != null &&
    tradeQuote.data.cost > managerBalanceRaw;
  const isQuantityInvalid = quantityInput.trim() !== '' && quantity == null;

  return (
    <section className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
      <div>
        <h2 className="text-base font-semibold">{t('trade.title')}</h2>
        <p className="text-sm text-zinc-500">{t('trade.subtitle')}</p>
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
        {isOpeningCutoff ? (
          <div className="mt-3 text-sm text-amber-200">{t('trade.openingCutoff')}</div>
        ) : null}
        {isManagerBalanceInsufficient ? (
          <div className="mt-3 text-sm text-red-300">{t('trade.insufficientManagerBalance')}</div>
        ) : null}

        <button
          className="mt-4 h-10 w-full rounded-md bg-zinc-800 px-3 text-sm font-semibold text-zinc-400"
          disabled
          type="button"
        >
          {t('trade.mintComingSoon')}
        </button>
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
