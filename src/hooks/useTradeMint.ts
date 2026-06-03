import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentAccount, useCurrentClient, useDAppKit } from '@mysten/dapp-kit-react';
import type { SuiClientTypes } from '@mysten/sui/client';
import { PREDICT_CONFIG } from '../config/predict';
import type { TradeQuoteRequest } from '../lib/deepbook/quote';
import {
  buildDirectionalMintTransaction,
  buildRangeMintTransaction,
} from '../lib/deepbook/transactions';

interface UseTradeMintOptions {
  managerId: string | null;
}

interface TradeMintInput {
  managerTopUpAmount?: bigint;
  request: TradeQuoteRequest;
}

export function useTradeMint({ managerId }: UseTradeMintOptions) {
  const account = useCurrentAccount();
  const client = useCurrentClient();
  const dAppKit = useDAppKit();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ managerTopUpAmount = 0n, request }: TradeMintInput) => {
      if (!managerId) throw new Error('Create or load a PredictManager before minting.');

      const transaction =
        request.kind === 'range'
          ? buildRangeMintTransaction({
              ...request,
              managerId,
              managerTopUpAmount,
            })
          : buildDirectionalMintTransaction({
              ...request,
              isUp: request.kind === 'above',
              managerId,
              managerTopUpAmount,
            });
      const result = await dAppKit.signAndExecuteTransaction({ transaction });
      const confirmed = await client.waitForTransaction({
        result,
        include: { events: true, effects: true },
        timeout: 30_000,
      });
      const tx = getTransaction(confirmed);

      if (!tx.status.success) {
        const message = tx.status.error?.message ?? 'Mint transaction failed.';
        throw new Error(message);
      }

      return {
        digest: tx.digest,
      };
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['predict-manager-summary', managerId] }),
        queryClient.invalidateQueries({ queryKey: ['wallet-dusdc-balance', account?.address] }),
        queryClient.invalidateQueries({
          queryKey: ['predict-market-overview', PREDICT_CONFIG.predictObjectId],
        }),
        queryClient.invalidateQueries({ queryKey: ['predict-trade-quote'] }),
        queryClient.invalidateQueries({ queryKey: ['predict-manager-positions', managerId] }),
      ]);
    },
  });
}

function getTransaction<Include extends SuiClientTypes.TransactionInclude>(
  result: SuiClientTypes.TransactionResult<Include>,
) {
  return result.$kind === 'Transaction' ? result.Transaction : result.FailedTransaction;
}
