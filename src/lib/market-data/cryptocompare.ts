import type { KlineInterval, KlineSeries } from './types';

interface CryptoCompareCandle {
  time: number;
  high: number;
  low: number;
  open: number;
  close: number;
}

interface CryptoCompareResponse {
  Response: 'Success' | 'Error';
  Message: string;
  Data?: {
    Data: CryptoCompareCandle[];
  };
}

const API_URL = 'https://min-api.cryptocompare.com/data/v2/histominute';
const DAY_SECONDS = 24 * 60 * 60;
const PAGE_LIMIT = 2000;

const INTERVAL_AGGREGATE: Record<KlineInterval, number> = {
  '1m': 1,
  '5m': 5,
  '15m': 15,
};

const INTERVAL_LOOKBACK_SECONDS: Record<KlineInterval, number> = {
  '1m': 7 * DAY_SECONDS,
  '5m': 7 * DAY_SECONDS,
  '15m': 7 * DAY_SECONDS,
};

export async function fetchBtcKlines(interval: KlineInterval): Promise<KlineSeries> {
  const fetchedAt = Date.now();
  const endTime = Math.floor(fetchedAt / 1000);
  const targetStartTime = endTime - INTERVAL_LOOKBACK_SECONDS[interval];
  const rawCandlesByTime = new Map<number, CryptoCompareCandle>();
  let toTs = endTime;
  const maxPages = getMaxPages(interval);

  for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
    const page = await fetchBtcKlinePage(toTs);

    if (page.length === 0) break;

    let earliestPageTime = Number.POSITIVE_INFINITY;

    for (const candle of page) {
      earliestPageTime = Math.min(earliestPageTime, candle.time);

      if (
        candle.time >= targetStartTime &&
        candle.open > 0 &&
        candle.high > 0 &&
        candle.low > 0 &&
        candle.close > 0
      ) {
        rawCandlesByTime.set(candle.time, candle);
      }
    }

    if (earliestPageTime <= targetStartTime) break;

    const nextToTs = earliestPageTime - 60;
    if (nextToTs >= toTs) break;
    toTs = nextToTs;
  }

  const rawCandles = Array.from(rawCandlesByTime.values()).sort((a, b) => a.time - b.time);
  const candles = aggregateCandles(rawCandles, interval);

  return {
    candles,
    latestPrice: candles.at(-1)?.close ?? null,
    fetchedAt,
    provider: 'CryptoCompare',
  };
}

async function fetchBtcKlinePage(toTs: number): Promise<CryptoCompareCandle[]> {
  const url = new URL(API_URL);
  url.searchParams.set('fsym', 'BTC');
  url.searchParams.set('tsym', 'USD');
  url.searchParams.set('limit', String(PAGE_LIMIT));
  url.searchParams.set('aggregate', '1');
  url.searchParams.set('toTs', String(toTs));

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`CryptoCompare request failed: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as CryptoCompareResponse;

  if (payload.Response !== 'Success' || !payload.Data) {
    throw new Error(payload.Message || 'CryptoCompare returned an invalid response');
  }

  return payload.Data.Data;
}

function aggregateCandles(
  rawCandles: CryptoCompareCandle[],
  interval: KlineInterval,
): KlineSeries['candles'] {
  const aggregate = INTERVAL_AGGREGATE[interval];

  if (aggregate === 1) {
    return rawCandles.map((candle) => ({
      time: candle.time as KlineSeries['candles'][number]['time'],
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));
  }

  const bucketSizeSeconds = aggregate * 60;
  const buckets = new Map<number, KlineSeries['candles'][number]>();

  for (const candle of rawCandles) {
    const bucketTime = Math.floor(candle.time / bucketSizeSeconds) * bucketSizeSeconds;
    const existing = buckets.get(bucketTime);

    if (!existing) {
      buckets.set(bucketTime, {
        time: bucketTime as KlineSeries['candles'][number]['time'],
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      });
      continue;
    }

    existing.high = Math.max(existing.high, candle.high);
    existing.low = Math.min(existing.low, candle.low);
    existing.close = candle.close;
  }

  return Array.from(buckets.values()).sort((a, b) => Number(a.time) - Number(b.time));
}

function getMaxPages(interval: KlineInterval) {
  const pageSpanSeconds = PAGE_LIMIT * 60;

  return Math.ceil(INTERVAL_LOOKBACK_SECONDS[interval] / pageSpanSeconds) + 1;
}
