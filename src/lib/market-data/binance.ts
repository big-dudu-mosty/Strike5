import type { KlineInterval, KlineSeries } from './types';

// Binance public market-data mirror: CORS-friendly, no API key, and returns
// 1m / 5m / 15m candles directly so no client-side pagination or aggregation
// is needed. `api.binance.com` is geo-restricted in some regions, so the
// `data-api.binance.vision` mirror is used instead.
const API_URL = 'https://data-api.binance.vision/api/v3/klines';
const SYMBOL = 'BTCUSDT';
const LIMIT = 1000;

export async function fetchBtcKlines(interval: KlineInterval): Promise<KlineSeries> {
  const fetchedAt = Date.now();
  const url = new URL(API_URL);
  url.searchParams.set('symbol', SYMBOL);
  url.searchParams.set('interval', interval);
  url.searchParams.set('limit', String(LIMIT));

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Binance request failed: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as unknown;

  if (!Array.isArray(payload)) {
    throw new Error('Binance returned an invalid response');
  }

  const candles = payload
    .map((row) => toCandle(row))
    .filter((candle): candle is KlineSeries['candles'][number] => candle !== null);

  return {
    candles,
    latestPrice: candles.at(-1)?.close ?? null,
    fetchedAt,
    provider: 'Binance',
  };
}

function toCandle(row: unknown): KlineSeries['candles'][number] | null {
  if (!Array.isArray(row)) return null;

  const openTime = Number(row[0]);
  const open = Number(row[1]);
  const high = Number(row[2]);
  const low = Number(row[3]);
  const close = Number(row[4]);

  if (![openTime, open, high, low, close].every((value) => Number.isFinite(value))) {
    return null;
  }
  if (open <= 0 || high <= 0 || low <= 0 || close <= 0) {
    return null;
  }

  return {
    time: Math.floor(openTime / 1000) as KlineSeries['candles'][number]['time'],
    open,
    high,
    low,
    close,
  };
}
