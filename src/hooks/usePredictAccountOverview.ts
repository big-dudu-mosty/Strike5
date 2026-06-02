import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useCurrentAccount,
  useCurrentClient,
  useCurrentNetwork,
  useDAppKit,
} from '@mysten/dapp-kit-react';
import type { SuiClientTypes } from '@mysten/sui/client';
import { PREDICT_CONFIG } from '../config/predict';
import { recoverLatestPredictManager } from '../lib/deepbook/managerRecovery';
import {
  buildCreatePredictManagerTransaction,
  buildDepositToPredictManagerTransaction,
} from '../lib/deepbook/transactions';
import {
  fetchPredictManagers,
  fetchPredictManagerSummary,
} from '../lib/predict-server/client';

interface CreatedManagerHint {
  managerId: string;
  digest: string;
}

export function usePredictAccountOverview() {
  const account = useCurrentAccount();
  const client = useCurrentClient();
  const currentNetwork = useCurrentNetwork();
  const dAppKit = useDAppKit();
  const queryClient = useQueryClient();
  const [createdManagerHint, setCreatedManagerHint] = useState<CreatedManagerHint | null>(null);
  const address = account?.address ?? null;

  useEffect(() => {
    setCreatedManagerHint(null);
  }, [address]);

  const walletBalanceQuery = useQuery({
    queryKey: ['wallet-dusdc-balance', address],
    queryFn: async () => {
      if (!address) throw new Error('Wallet address is required.');

      const response = await client.getBalance({
        owner: address,
        coinType: PREDICT_CONFIG.dusdcType,
      });

      return response.balance.coinBalance;
    },
    enabled: Boolean(address),
  });

  const managersQuery = useQuery({
    queryKey: ['predict-managers', address],
    queryFn: async () => {
      if (!address) throw new Error('Wallet address is required.');
      return fetchPredictManagers(address);
    },
    enabled: Boolean(address),
  });

  const indexedManager = managersQuery.data?.[0] ?? null;
  const recoveredManagerQuery = useQuery({
    queryKey: ['recovered-predict-manager', address],
    queryFn: async () => {
      if (!address) throw new Error('Wallet address is required.');
      return recoverLatestPredictManager(address);
    },
    enabled: Boolean(address && !indexedManager),
    refetchInterval: (query) => (query.state.data ? false : 10_000),
  });

  const recoveredManager = recoveredManagerQuery.data ?? null;
  const managerId =
    indexedManager?.manager_id ??
    recoveredManager?.managerId ??
    createdManagerHint?.managerId ??
    null;
  const managerSource = indexedManager
    ? 'indexed'
    : recoveredManager || createdManagerHint
      ? 'transaction'
      : null;

  const managerSummaryQuery = useQuery({
    queryKey: ['predict-manager-summary', managerId],
    queryFn: async () => {
      if (!managerId) throw new Error('PredictManager id is required.');
      return fetchPredictManagerSummary(managerId);
    },
    enabled: Boolean(managerId && indexedManager),
  });

  const createManagerMutation = useMutation({
    mutationFn: async () => {
      if (!address) throw new Error('Connect a wallet before creating a PredictManager.');

      const transaction = buildCreatePredictManagerTransaction();
      const result = await dAppKit.signAndExecuteTransaction({ transaction });
      const confirmed = await client.waitForTransaction({
        result,
        include: { events: true, effects: true },
        timeout: 30_000,
      });
      const tx = getTransaction(confirmed);

      if (!tx.status.success) {
        const message = tx.status.error?.message ?? 'PredictManager creation failed.';
        throw new Error(message);
      }

      return {
        digest: tx.digest,
        managerId: getCreatedManagerId(tx, address),
      };
    },
    onSuccess: async ({ digest, managerId }) => {
      if (managerId) {
        setCreatedManagerHint({ digest, managerId });
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['predict-managers', address] }),
        queryClient.invalidateQueries({ queryKey: ['recovered-predict-manager', address] }),
        queryClient.invalidateQueries({ queryKey: ['wallet-dusdc-balance', address] }),
      ]);
    },
    onError: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['predict-managers', address] }),
        queryClient.invalidateQueries({ queryKey: ['recovered-predict-manager', address] }),
      ]);
    },
  });

  const depositDUsdcMutation = useMutation({
    mutationFn: async (amount: bigint) => {
      if (!address) throw new Error('Connect a wallet before depositing dUSDC.');
      if (!managerId) throw new Error('Create or load a PredictManager before depositing dUSDC.');

      const transaction = buildDepositToPredictManagerTransaction({
        amount,
        managerId,
      });
      const result = await dAppKit.signAndExecuteTransaction({ transaction });
      const confirmed = await client.waitForTransaction({
        result,
        include: { effects: true },
        timeout: 30_000,
      });
      const tx = getTransaction(confirmed);

      if (!tx.status.success) {
        const message = tx.status.error?.message ?? 'dUSDC deposit failed.';
        throw new Error(message);
      }

      return {
        digest: tx.digest,
      };
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['wallet-dusdc-balance', address] }),
        queryClient.invalidateQueries({ queryKey: ['predict-manager-summary', managerId] }),
      ]);
    },
  });

  const walletDUsdcBalance = useMemo(() => {
    return scaleRawQuoteBalance(walletBalanceQuery.data);
  }, [walletBalanceQuery.data]);
  const walletDUsdcBalanceRaw = useMemo(() => {
    return walletBalanceQuery.data == null ? null : BigInt(walletBalanceQuery.data);
  }, [walletBalanceQuery.data]);

  return {
    account,
    address,
    currentNetwork,
    isExpectedNetwork: currentNetwork === PREDICT_CONFIG.network,
    walletDUsdcBalance,
    walletDUsdcBalanceRaw,
    walletBalanceQuery,
    managersQuery,
    recoveredManagerQuery,
    managerId,
    managerSource,
    managerSummary: managerSummaryQuery.data ?? null,
    managerSummaryQuery,
    createdManagerHint,
    createManager: () => createManagerMutation.mutateAsync(),
    createManagerMutation,
    depositDUsdc: (amount: bigint) => depositDUsdcMutation.mutateAsync(amount),
    depositDUsdcMutation,
  };
}

export type PredictAccountOverview = ReturnType<typeof usePredictAccountOverview>;

function getTransaction<Include extends SuiClientTypes.TransactionInclude>(
  result: SuiClientTypes.TransactionResult<Include>,
) {
  return result.$kind === 'Transaction' ? result.Transaction : result.FailedTransaction;
}

function getCreatedManagerId(
  tx: SuiClientTypes.Transaction<{ events: true; effects: true }>,
  owner: string,
) {
  const event = tx.events?.find((item) => {
    return (
      item.eventType.endsWith('::predict_manager::PredictManagerCreated') &&
      item.json?.owner === owner
    );
  });

  const managerId = event?.json?.manager_id;
  return typeof managerId === 'string' ? managerId : null;
}

function scaleRawQuoteBalance(raw: string | null | undefined) {
  if (raw == null) return null;
  return Number(raw) / 1_000_000;
}
