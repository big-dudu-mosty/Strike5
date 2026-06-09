import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentAccount, useCurrentClient, useDAppKit } from '@mysten/dapp-kit-react';
import type { SuiClientTypes } from '@mysten/sui/client';
import type { Transaction } from '@mysten/sui/transactions';
import { PREDICT_CONFIG } from '../config/predict';
import type { PredictPositionDisplayRow } from './usePredictPositions';
import {
  buildDirectionalRedeemTransaction,
  buildRangeRedeemTransaction,
} from '../lib/deepbook/transactions';

interface UsePositionRedeemOptions {
  managerId: string | null;
}

type RedeemSimulationClient = {
  simulateTransaction: <Include extends SuiClientTypes.SimulateTransactionInclude>(
    options: SuiClientTypes.SimulateTransactionOptions<Include>,
  ) => Promise<SuiClientTypes.SimulateTransactionResult<Include>>;
};

export function usePositionRedeem({ managerId }: UsePositionRedeemOptions) {
  const account = useCurrentAccount();
  const client = useCurrentClient();
  const dAppKit = useDAppKit();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (position: PredictPositionDisplayRow) => {
      if (!managerId) throw new Error('Create or load a PredictManager before redeeming.');
      if (!account) throw new Error('Connect a wallet before redeeming.');
      if (position.openQuantity <= 0) throw new Error('Position has no open quantity.');

      const previewTransaction = buildRedeemTransaction(position, managerId);
      previewTransaction.setSender(account.address);
      await assertRedeemSimulationSucceeds(client, previewTransaction);

      const transaction = buildRedeemTransaction(position, managerId);
      const result = await dAppKit.signAndExecuteTransaction({ transaction });
      const confirmed = await client.waitForTransaction({
        result,
        include: { events: true, effects: true },
        timeout: 30_000,
      });
      const tx = getTransaction(confirmed);

      if (!tx.status.success) {
        const message = tx.status.error?.message ?? 'Redeem transaction failed.';
        throw new Error(message);
      }

      return {
        digest: tx.digest,
        positionId: position.id,
      };
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['predict-manager-summary', managerId] }),
        queryClient.invalidateQueries({ queryKey: ['predict-manager-positions', managerId] }),
        queryClient.invalidateQueries({ queryKey: ['arena-leaderboard-stats', managerId] }),
        queryClient.invalidateQueries({
          queryKey: ['predict-market-overview', PREDICT_CONFIG.predictObjectId],
        }),
        queryClient.invalidateQueries({ queryKey: ['predict-trade-quote'] }),
      ]);
    },
  });
}

function buildRedeemTransaction(position: PredictPositionDisplayRow, managerId: string) {
  return position.kind === 'range'
    ? buildRangeRedeemTransaction({
        expiry: toU64(position.expiry),
        higherStrike: toU64(position.higherStrike),
        lowerStrike: toU64(position.lowerStrike),
        managerId,
        oracleId: position.oracleId,
        quantity: toU64(position.openQuantity),
      })
    : buildDirectionalRedeemTransaction({
        expiry: toU64(position.expiry),
        isUp: position.kind === 'above',
        managerId,
        oracleId: position.oracleId,
        quantity: toU64(position.openQuantity),
        strike: toU64(position.strike),
      });
}

async function assertRedeemSimulationSucceeds(
  client: RedeemSimulationClient,
  transaction: Transaction,
) {
  const result = await client.simulateTransaction({
    transaction,
    include: { effects: true },
    checksEnabled: false,
  });
  const tx = getTransaction(result);

  if (!tx.status.success) {
    const message = tx.status.error?.message ?? 'Redeem preflight failed.';
    throw new Error(`Redeem preflight failed before wallet signing: ${message}`);
  }
}

function toU64(value: number) {
  return BigInt(Math.max(0, Math.trunc(value)));
}

function getTransaction<Include extends SuiClientTypes.TransactionInclude>(
  result: SuiClientTypes.TransactionResult<Include>,
) {
  return result.$kind === 'Transaction' ? result.Transaction : result.FailedTransaction;
}
