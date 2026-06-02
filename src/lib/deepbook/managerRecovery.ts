import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { PREDICT_CONFIG } from '../../config/predict';

const jsonRpcClient = new SuiJsonRpcClient({
  network: PREDICT_CONFIG.network,
  url: PREDICT_CONFIG.suiRpcUrl,
});

interface RecoveredPredictManager {
  digest: string;
  managerId: string;
}

export async function recoverLatestPredictManager(owner: string): Promise<RecoveredPredictManager | null> {
  const response = await jsonRpcClient.queryTransactionBlocks({
    filter: { FromAddress: owner },
    limit: 25,
    order: 'descending',
    options: {
      showEvents: true,
      showInput: true,
    },
  });

  for (const tx of response.data) {
    if (!isCreateManagerTransaction(tx)) continue;

    const managerId = getCreatedManagerIdFromEvents(tx.events, owner);
    if (managerId) {
      return {
        digest: tx.digest,
        managerId,
      };
    }
  }

  return null;
}

function isCreateManagerTransaction(tx: { transaction?: unknown }) {
  const transaction = tx.transaction as
    | {
        data?: {
          transaction?: {
            transactions?: Array<{
              MoveCall?: {
                package?: string;
                module?: string;
                function?: string;
              };
            }>;
          };
        };
      }
    | undefined;

  return transaction?.data?.transaction?.transactions?.some((command) => {
    const moveCall = command.MoveCall;
    return (
      moveCall?.package === PREDICT_CONFIG.predictPackageId &&
      moveCall.module === 'predict' &&
      moveCall.function === 'create_manager'
    );
  });
}

function getCreatedManagerIdFromEvents(events: unknown, owner: string) {
  if (!Array.isArray(events)) return null;

  const event = events.find((item) => {
    const candidate = item as {
      type?: string;
      parsedJson?: {
        manager_id?: string;
        owner?: string;
      };
    };

    return (
      candidate.type?.endsWith('::predict_manager::PredictManagerCreated') &&
      candidate.parsedJson?.owner === owner &&
      typeof candidate.parsedJson.manager_id === 'string'
    );
  }) as
    | {
        parsedJson?: {
          manager_id?: string;
        };
      }
    | undefined;

  return event?.parsedJson?.manager_id ?? null;
}
