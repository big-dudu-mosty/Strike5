import { useQuery } from '@tanstack/react-query';
import { fetchBtcKlines } from '../lib/market-data/cryptocompare';
import type { KlineInterval } from '../lib/market-data/types';

export function useBtcKlines(interval: KlineInterval) {
  return useQuery({
    queryKey: ['btc-klines', interval],
    queryFn: () => fetchBtcKlines(interval),
    refetchInterval: 20_000,
    staleTime: 10_000,
  });
}
