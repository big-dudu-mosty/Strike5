import type { CandlestickData, UTCTimestamp } from 'lightweight-charts';

export type KlineInterval = '1m' | '5m' | '15m';

export interface BtcCandle extends CandlestickData<UTCTimestamp> {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface KlineSeries {
  candles: BtcCandle[];
  latestPrice: number | null;
  fetchedAt: number;
  provider: 'Binance';
}
