import { Transaction } from '@mysten/sui/transactions';
import { PREDICT_CONFIG } from '../../config/predict';

export function buildCreatePredictManagerTransaction() {
  const tx = new Transaction();

  tx.moveCall({
    target: `${PREDICT_CONFIG.predictPackageId}::predict::create_manager`,
  });

  return tx;
}
