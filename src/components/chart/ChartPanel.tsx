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
  interval: KlineInterval;
  onIntervalChange: (interval: KlineInterval) => void;
  oracleSpot: number | null;
  tradeOverlay: ChartTradeOverlay | null;
  provider?: string;
  isLoading: boolean;
  error: Error | unknown;
}

export function ChartPanel({
  candles,
  interval,
  onIntervalChange,
  oracleSpot,
  tradeOverlay,
  provider,
  isLoading,
  error,
}: ChartPanelProps) {
  const { t } = useI18n();
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
        background: { type: ColorType.Solid, color: '#18181b' },
        textColor: '#a1a1aa',
      },
      grid: {
        vertLines: { color: '#27272a' },
        horzLines: { color: '#27272a' },
      },
      rightPriceScale: {
        borderColor: '#3f3f46',
      },
      timeScale: {
        borderColor: '#3f3f46',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: { color: '#71717a' },
        horzLine: { color: '#71717a' },
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#34d399',
      downColor: '#fb7185',
      borderUpColor: '#34d399',
      borderDownColor: '#fb7185',
      wickUpColor: '#34d399',
      wickDownColor: '#fb7185',
      priceLineColor: '#71717a',
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
      color: '#60a5fa',
      lineWidth: 2,
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
          color: '#fbbf24',
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: t('chart.rangeLowerLine'),
        });
      }
      if (tradeOverlay.higherStrike != null) {
        rangeHigherLineRef.current = series.createPriceLine({
          price: tradeOverlay.higherStrike,
          color: '#fbbf24',
          lineWidth: 2,
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
      color: tradeOverlay.kind === 'above' ? '#34d399' : '#fb7185',
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: tradeOverlay.kind === 'above' ? t('chart.aboveLine') : t('chart.belowLine'),
    });
  }, [t, tradeOverlay]);

  return (
    <section className="rounded-md border border-zinc-800 bg-zinc-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
        <div>
          <h2 className="text-base font-semibold">{t('chart.title')}</h2>
          <p className="text-sm text-zinc-500">{t('chart.subtitle')}</p>
        </div>
        <div className="flex rounded-md border border-zinc-800 bg-zinc-950 p-1 text-sm">
          {intervals.map((item) => (
            <button
              className={[
                'h-8 rounded px-3 transition',
                item === interval
                  ? 'bg-emerald-400 text-zinc-950'
                  : 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50',
              ].join(' ')}
              key={item}
              onClick={() => onIntervalChange(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="relative min-h-[320px]">
        <div className="h-[360px] min-h-[320px]" ref={containerRef} />

        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/70 text-sm text-zinc-400">
            {t('chart.loading')}
          </div>
        ) : null}

        {error ? (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/85 px-6">
            <div className="flex flex-col items-center gap-3 text-center text-zinc-500">
              <CandlestickChart className="h-10 w-10 text-zinc-600" aria-hidden="true" />
              <div>
                <div className="text-sm font-medium text-zinc-300">{t('chart.error')}</div>
                <div className="mt-1 max-w-md text-sm">{t('chart.placeholder.body')}</div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-2 text-xs text-zinc-500">
        <span>
          {t('chart.source')}: {provider ?? 'CryptoCompare'}
        </span>
        <span>{tradeOverlay ? formatTradeOverlayLabel(tradeOverlay, t) : t('chart.oracleLine')}</span>
      </div>
    </section>
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
