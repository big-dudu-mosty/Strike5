import { useQuery } from '@tanstack/react-query';
import { PREDICT_CONFIG } from '../config/predict';
import { fetchPredictMarketOverview } from '../lib/predict-server/client';

export function usePredictMarketOverview() {
  return useQuery({
    queryKey: ['predict-market-overview', PREDICT_CONFIG.predictObjectId],
    queryFn: () => fetchPredictMarketOverview(),
    refetchInterval: 5_000,
    staleTime: 2_000,
  });
}
