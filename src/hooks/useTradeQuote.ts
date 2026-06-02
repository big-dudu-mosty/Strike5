import { useQuery } from '@tanstack/react-query';
import { useCurrentClient } from '@mysten/dapp-kit-react';
import { quotePredictTrade, type TradeQuoteRequest } from '../lib/deepbook/quote';

export function useTradeQuote(request: TradeQuoteRequest | null) {
  const client = useCurrentClient();

  return useQuery({
    queryKey: [
      'predict-trade-quote',
      request?.kind ?? null,
      request?.oracleId ?? null,
      request?.expiry.toString() ?? null,
      request?.quantity.toString() ?? null,
      request?.kind === 'range' ? request.lowerStrike.toString() : request?.strike.toString(),
      request?.kind === 'range' ? request.higherStrike.toString() : null,
    ],
    queryFn: () => {
      if (!request) throw new Error('Trade quote request is required.');
      return quotePredictTrade(client, request);
    },
    enabled: Boolean(request),
    refetchInterval: request ? 5_000 : false,
    staleTime: 2_000,
  });
}
