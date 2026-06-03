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
      if (!account) throw new Error('Connect a wallet before minting.');
      if (!managerId) throw new Error('Create or load a PredictManager before minting.');

      const buildTransaction = () =>
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

      const preflightTransaction = buildTransaction();
      preflightTransaction.setSender(account.address);
      const preflightResult = await client.simulateTransaction({
        transaction: preflightTransaction,
        include: { effects: true },
        checksEnabled: true,
      });
      const preflightTx =
        preflightResult.$kind === 'Transaction'
          ? preflightResult.Transaction
          : preflightResult.FailedTransaction;

      if (!preflightTx.status.success) {
        const message = preflightTx.status.error?.message ?? 'Mint transaction preflight failed.';
        throw new Error(classifyMintError(message, true));
      }

      const transaction = buildTransaction();
      const result = await dAppKit.signAndExecuteTransaction({ transaction });
      const confirmed = await client.waitForTransaction({
        result,
        include: { events: true, effects: true },
        timeout: 30_000,
      });
      const tx = getTransaction(confirmed);

      if (!tx.status.success) {
        const message = tx.status.error?.message ?? 'Mint transaction failed.';
        throw new Error(classifyMintError(message, false));
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

function classifyMintError(message: string, isPreflight: boolean) {
  if (
    message.includes('withdraw_with_proof') ||
    message.includes('EBalanceManagerBalanceTooLow') ||
    (message.includes('balance_manager') && message.includes(', 3'))
  ) {
    return 'STRIKE5_MANAGER_FUNDING_PRECHECK_FAILED';
  }

  return isPreflight ? 'STRIKE5_MINT_PREFLIGHT_FAILED' : message;
}

function getTransaction<Include extends SuiClientTypes.TransactionInclude>(
  result: SuiClientTypes.TransactionResult<Include>,
) {
  return result.$kind === 'Transaction' ? result.Transaction : result.FailedTransaction;
}
