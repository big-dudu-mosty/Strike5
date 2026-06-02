import { Transaction } from '@mysten/sui/transactions';
import { PREDICT_CONFIG } from '../../config/predict';

export function buildCreatePredictManagerTransaction() {
  const tx = new Transaction();

  tx.moveCall({
    target: `${PREDICT_CONFIG.predictPackageId}::predict::create_manager`,
  });

  return tx;
}

export function buildDepositToPredictManagerTransaction({
  amount,
  managerId,
}: {
  amount: bigint;
  managerId: string;
}) {
  const tx = new Transaction();
  const coin = tx.coin({
    type: PREDICT_CONFIG.dusdcType,
    balance: amount,
  });

  tx.moveCall({
    target: `${PREDICT_CONFIG.predictPackageId}::predict_manager::deposit`,
    typeArguments: [PREDICT_CONFIG.dusdcType],
    arguments: [tx.object(managerId), coin],
  });

  return tx;
}
