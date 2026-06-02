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

const INTERVAL_AGGREGATE: Record<KlineInterval, number> = {
  '1m': 1,
  '5m': 5,
  '15m': 15,
};

const INTERVAL_LIMIT: Record<KlineInterval, number> = {
  '1m': 180,
  '5m': 180,
  '15m': 160,
};

export async function fetchBtcKlines(interval: KlineInterval): Promise<KlineSeries> {
  const url = new URL(API_URL);
  url.searchParams.set('fsym', 'BTC');
  url.searchParams.set('tsym', 'USD');
  url.searchParams.set('limit', String(INTERVAL_LIMIT[interval]));
  url.searchParams.set('aggregate', String(INTERVAL_AGGREGATE[interval]));

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`CryptoCompare request failed: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as CryptoCompareResponse;

  if (payload.Response !== 'Success' || !payload.Data) {
    throw new Error(payload.Message || 'CryptoCompare returned an invalid response');
  }

  const candles = payload.Data.Data.map((candle) => ({
    time: candle.time as KlineSeries['candles'][number]['time'],
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
  })).filter((candle) => {
    return candle.open > 0 && candle.high > 0 && candle.low > 0 && candle.close > 0;
  });

  return {
    candles,
    latestPrice: candles.at(-1)?.close ?? null,
    fetchedAt: Date.now(),
    provider: 'CryptoCompare',
  };
}
