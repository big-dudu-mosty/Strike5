import { CandlestickChart } from 'lucide-react';
import { useEffect, useRef } from 'react';
import {
  CandlestickSeries,
  ColorType,
  createChart,
  LineStyle,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
} from 'lightweight-charts';
import { PRODUCT_TIMING } from '../../config/predict';
import { useNow } from '../../hooks/useNow';
import { formatDuration, formatFreshness, formatPercent, formatUsd } from '../../lib/formatters';
import { useI18n } from '../../lib/i18n/I18nProvider';
import type { BtcCandle, KlineInterval } from '../../lib/market-data/types';

const intervals: KlineInterval[] = ['1m', '5m', '15m'];

export interface ChartTradeOverlay {
  higherStrike?: number;
  kind: 'above' | 'below' | 'range';
  lowerStrike?: number;
  strike?: number;
}

interface ChartPanelProps {
  candles: BtcCandle[];
  chartOracleDiff: number | null;
  chartPrice: number | null;
  interval: KlineInterval;
  onIntervalChange: (interval: KlineInterval) => void;
  oracleSpot: number | null;
  oracleTimestamp: number | null;
  roundExpiryMs: number | null;
  tradeOverlay: ChartTradeOverlay | null;
  provider?: string;
  isLoading: boolean;
  error: Error | unknown;
}

export function ChartPanel({
  candles,
  chartOracleDiff,
  chartPrice,
  interval,
  onIntervalChange,
  oracleSpot,
  oracleTimestamp,
  roundExpiryMs,
  tradeOverlay,
  provider,
  isLoading,
  error,
}: ChartPanelProps) {
  const { t } = useI18n();
  const now = useNow();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const oracleLineRef = useRef<IPriceLine | null>(null);
  const rangeHigherLineRef = useRef<IPriceLine | null>(null);
  const rangeLowerLineRef = useRef<IPriceLine | null>(null);
  const selectedStrikeLineRef = useRef<IPriceLine | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#8388b6',
      },
      grid: {
        vertLines: { color: 'rgba(53, 67, 92, 0.42)' },
        horzLines: { color: 'rgba(53, 67, 92, 0.42)' },
      },
      rightPriceScale: {
        borderColor: '#263248',
      },
      timeScale: {
        borderColor: '#263248',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: { color: '#536279' },
        horzLine: { color: '#536279' },
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      priceLineColor: '#536279',
    });

    chartRef.current = chart;
    seriesRef.current = series;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      oracleLineRef.current = null;
      rangeHigherLineRef.current = null;
      rangeLowerLineRef.current = null;
      selectedStrikeLineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current) return;
    seriesRef.current.setData(candles);
    if (candles.length > 0) {
      chartRef.current?.timeScale().fitContent();
    }
  }, [candles]);

  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;

    if (oracleLineRef.current) {
      series.removePriceLine(oracleLineRef.current);
      oracleLineRef.current = null;
    }

    if (oracleSpot == null) return;

    oracleLineRef.current = series.createPriceLine({
      price: oracleSpot,
      color: '#9fa3cc',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: t('chart.oracleLine'),
    });
  }, [oracleSpot, t]);

  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;

    for (const lineRef of [selectedStrikeLineRef, rangeLowerLineRef, rangeHigherLineRef]) {
      if (lineRef.current) {
        series.removePriceLine(lineRef.current);
        lineRef.current = null;
      }
    }

    if (!tradeOverlay) return;

    if (tradeOverlay.kind === 'range') {
      if (tradeOverlay.lowerStrike != null) {
        rangeLowerLineRef.current = series.createPriceLine({
          price: tradeOverlay.lowerStrike,
          color: '#f0c24b',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: t('chart.rangeLowerLine'),
        });
      }
      if (tradeOverlay.higherStrike != null) {
        rangeHigherLineRef.current = series.createPriceLine({
          price: tradeOverlay.higherStrike,
          color: '#f0c24b',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: t('chart.rangeHigherLine'),
        });
      }
      return;
    }

    if (tradeOverlay.strike == null) return;

    selectedStrikeLineRef.current = series.createPriceLine({
      price: tradeOverlay.strike,
      color: '#f0c24b',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: tradeOverlay.kind === 'above' ? t('chart.aboveLine') : t('chart.belowLine'),
    });
  }, [t, tradeOverlay]);

  return (
    <section className="overflow-hidden rounded-3xl border border-ink-700/60 glass">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pb-2 pt-5">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cream-600">
            BTC / USD
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <span className="text-4xl font-bold tracking-tight text-cream-100 tabular-nums">
              {chartPrice == null ? '—' : formatUsd(chartPrice)}
            </span>
            {chartOracleDiff != null ? (
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
                  chartOracleDiff >= 0
                    ? 'bg-moss-400/15 text-moss-300'
                    : 'bg-clay-400/15 text-clay-300'
                }`}
              >
                {chartOracleDiff >= 0 ? '▲' : '▼'} {formatPercent(Math.abs(chartOracleDiff))}
              </span>
            ) : null}
          </div>
          <div className="mt-1.5 text-xs text-cream-600">
            {t('marketPulse.oracleSpot')}{' '}
            <span className="font-medium text-cream-300">
              {oracleSpot == null ? '—' : formatUsd(oracleSpot)}
            </span>
            {' · '}
            {t('marketPulse.oracleFreshness')}{' '}
            <span className="font-medium text-cream-300">
              {oracleTimestamp == null ? '—' : formatFreshness(now, oracleTimestamp)}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex rounded-full border border-ink-700/60 bg-ink-950/60 p-1 text-xs font-semibold">
            {intervals.map((item) => (
              <button
                className={[
                  'h-8 rounded-full px-3.5 transition',
                  item === interval
                    ? 'bg-cream-100 text-ink-950'
                    : 'text-cream-500 hover:text-cream-100',
                ].join(' ')}
                key={item}
                onClick={() => onIntervalChange(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
          <RoundPill expiryMs={roundExpiryMs} now={now} />
        </div>
      </div>

      <div className="relative min-h-[340px]">
        <div className="h-[380px] min-h-[340px] lg:h-[520px]" ref={containerRef} />

        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-ink-900/70 text-sm text-cream-500">
            {t('chart.loading')}
          </div>
        ) : null}

        {error ? (
          <div className="absolute inset-0 flex items-center justify-center bg-ink-900/85 px-6">
            <div className="flex flex-col items-center gap-3 text-center text-cream-600">
              <CandlestickChart className="h-10 w-10 text-cream-700" aria-hidden="true" />
              <div>
                <div className="text-sm font-medium text-cream-300">{t('chart.error')}</div>
                <div className="mt-1 max-w-md text-sm">{t('chart.placeholder.body')}</div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between border-t border-ink-700 px-4 py-2 text-xs text-cream-600">
        <span>
          {t('chart.source')}: {provider ?? 'Binance'}
        </span>
        {candles.length > 0 ? (
          <span className="hidden text-cream-500 sm:inline">{t('chart.lookback7d')}</span>
        ) : null}
        <span>{tradeOverlay ? formatTradeOverlayLabel(tradeOverlay, t) : t('chart.oracleLine')}</span>
      </div>
    </section>
  );
}

function RoundPill({ expiryMs, now }: { expiryMs: number | null; now: number }) {
  const { t } = useI18n();

  if (expiryMs == null) return null;

  const left = expiryMs - now;
  const isCutoff = left > 0 && left <= PRODUCT_TIMING.openingCutoffMs;
  const isExpired = left <= 0;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
        isExpired
          ? 'bg-ink-800 text-cream-500'
          : isCutoff
            ? 'bg-amber-400/15 text-amber-200'
            : 'bg-moss-400/15 text-moss-300'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isExpired ? 'bg-cream-600' : isCutoff ? 'bg-amber-300' : 'animate-pulse bg-moss-400'
        }`}
      />
      {isExpired
        ? t('positions.status.awaitingSettlement')
        : `${isCutoff ? t('trade.round.closed') : t('trade.round.open')} · ${formatDuration(left)}`}
    </span>
  );
}

function formatTradeOverlayLabel(
  overlay: ChartTradeOverlay,
  t: (key: 'chart.aboveLine' | 'chart.belowLine' | 'chart.rangeLine' | 'chart.oracleLine') => string,
) {
  switch (overlay.kind) {
    case 'above':
      return t('chart.aboveLine');
    case 'below':
      return t('chart.belowLine');
    case 'range':
      return t('chart.rangeLine');
    default:
      return t('chart.oracleLine');
  }
}
