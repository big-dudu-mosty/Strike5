import { Transaction } from '@mysten/sui/transactions';
import { SUI_CLOCK_OBJECT_ID } from '@mysten/sui/utils';
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

export function buildWithdrawFromPredictManagerTransaction({
  amount,
  managerId,
  recipient,
}: {
  amount: bigint;
  managerId: string;
  recipient: string;
}) {
  const tx = new Transaction();

  const coin = tx.moveCall({
    target: `${PREDICT_CONFIG.predictPackageId}::predict_manager::withdraw`,
    typeArguments: [PREDICT_CONFIG.dusdcType],
    arguments: [tx.object(managerId), tx.pure.u64(amount)],
  });

  tx.transferObjects([coin], tx.pure.address(recipient));

  return tx;
}

export function buildDirectionalQuoteTransaction({
  expiry,
  isUp,
  oracleId,
  quantity,
  sender,
  strike,
}: {
  expiry: bigint;
  isUp: boolean;
  oracleId: string;
  quantity: bigint;
  sender: string;
  strike: bigint;
}) {
  const tx = new Transaction();
  tx.setSender(sender);

  const key = tx.moveCall({
    target: `${PREDICT_CONFIG.predictPackageId}::market_key::new`,
    arguments: [
      tx.pure.id(oracleId),
      tx.pure.u64(expiry),
      tx.pure.u64(strike),
      tx.pure.bool(isUp),
    ],
  });

  tx.moveCall({
    target: `${PREDICT_CONFIG.predictPackageId}::predict::get_trade_amounts`,
    arguments: [
      tx.object(PREDICT_CONFIG.predictObjectId),
      tx.object(oracleId),
      key,
      tx.pure.u64(quantity),
      tx.object(SUI_CLOCK_OBJECT_ID),
    ],
  });

  return tx;
}

export function buildRangeQuoteTransaction({
  expiry,
  higherStrike,
  lowerStrike,
  oracleId,
  quantity,
  sender,
}: {
  expiry: bigint;
  higherStrike: bigint;
  lowerStrike: bigint;
  oracleId: string;
  quantity: bigint;
  sender: string;
}) {
  const tx = new Transaction();
  tx.setSender(sender);

  const key = tx.moveCall({
    target: `${PREDICT_CONFIG.predictPackageId}::range_key::new`,
    arguments: [
      tx.pure.id(oracleId),
      tx.pure.u64(expiry),
      tx.pure.u64(lowerStrike),
      tx.pure.u64(higherStrike),
    ],
  });

  tx.moveCall({
    target: `${PREDICT_CONFIG.predictPackageId}::predict::get_range_trade_amounts`,
    arguments: [
      tx.object(PREDICT_CONFIG.predictObjectId),
      tx.object(oracleId),
      key,
      tx.pure.u64(quantity),
      tx.object(SUI_CLOCK_OBJECT_ID),
    ],
  });

  return tx;
}

export function buildDirectionalMintTransaction({
  expiry,
  isUp,
  managerId,
  managerTopUpAmount = 0n,
  oracleId,
  quantity,
  strike,
}: {
  expiry: bigint;
  isUp: boolean;
  managerId: string;
  managerTopUpAmount?: bigint;
  oracleId: string;
  quantity: bigint;
  strike: bigint;
}) {
  const tx = new Transaction();

  depositManagerTopUp(tx, managerId, managerTopUpAmount);

  const key = tx.moveCall({
    target: `${PREDICT_CONFIG.predictPackageId}::market_key::new`,
    arguments: [
      tx.pure.id(oracleId),
      tx.pure.u64(expiry),
      tx.pure.u64(strike),
      tx.pure.bool(isUp),
    ],
  });

  tx.moveCall({
    target: `${PREDICT_CONFIG.predictPackageId}::predict::mint`,
    typeArguments: [PREDICT_CONFIG.dusdcType],
    arguments: [
      tx.object(PREDICT_CONFIG.predictObjectId),
      tx.object(managerId),
      tx.object(oracleId),
      key,
      tx.pure.u64(quantity),
      tx.object(SUI_CLOCK_OBJECT_ID),
    ],
  });

  return tx;
}

export function buildDirectionalRedeemTransaction({
  expiry,
  isUp,
  managerId,
  oracleId,
  quantity,
  strike,
}: {
  expiry: bigint;
  isUp: boolean;
  managerId: string;
  oracleId: string;
  quantity: bigint;
  strike: bigint;
}) {
  const tx = new Transaction();

  const key = tx.moveCall({
    target: `${PREDICT_CONFIG.predictPackageId}::market_key::new`,
    arguments: [
      tx.pure.id(oracleId),
      tx.pure.u64(expiry),
      tx.pure.u64(strike),
      tx.pure.bool(isUp),
    ],
  });

  tx.moveCall({
    target: `${PREDICT_CONFIG.predictPackageId}::predict::redeem`,
    typeArguments: [PREDICT_CONFIG.dusdcType],
    arguments: [
      tx.object(PREDICT_CONFIG.predictObjectId),
      tx.object(managerId),
      tx.object(oracleId),
      key,
      tx.pure.u64(quantity),
      tx.object(SUI_CLOCK_OBJECT_ID),
    ],
  });

  return tx;
}

export function buildRangeMintTransaction({
  expiry,
  higherStrike,
  lowerStrike,
  managerId,
  managerTopUpAmount = 0n,
  oracleId,
  quantity,
}: {
  expiry: bigint;
  higherStrike: bigint;
  lowerStrike: bigint;
  managerId: string;
  managerTopUpAmount?: bigint;
  oracleId: string;
  quantity: bigint;
}) {
  const tx = new Transaction();

  depositManagerTopUp(tx, managerId, managerTopUpAmount);

  const key = tx.moveCall({
    target: `${PREDICT_CONFIG.predictPackageId}::range_key::new`,
    arguments: [
      tx.pure.id(oracleId),
      tx.pure.u64(expiry),
      tx.pure.u64(lowerStrike),
      tx.pure.u64(higherStrike),
    ],
  });

  tx.moveCall({
    target: `${PREDICT_CONFIG.predictPackageId}::predict::mint_range`,
    typeArguments: [PREDICT_CONFIG.dusdcType],
    arguments: [
      tx.object(PREDICT_CONFIG.predictObjectId),
      tx.object(managerId),
      tx.object(oracleId),
      key,
      tx.pure.u64(quantity),
      tx.object(SUI_CLOCK_OBJECT_ID),
    ],
  });

  return tx;
}

function depositManagerTopUp(tx: Transaction, managerId: string, amount: bigint) {
  if (amount <= 0n) return;

  const coin = tx.coin({
    type: PREDICT_CONFIG.dusdcType,
    balance: amount,
  });

  tx.moveCall({
    target: `${PREDICT_CONFIG.predictPackageId}::predict_manager::deposit`,
    typeArguments: [PREDICT_CONFIG.dusdcType],
    arguments: [tx.object(managerId), coin],
  });
}

export function buildRangeRedeemTransaction({
  expiry,
  higherStrike,
  lowerStrike,
  managerId,
  oracleId,
  quantity,
}: {
  expiry: bigint;
  higherStrike: bigint;
  lowerStrike: bigint;
  managerId: string;
  oracleId: string;
  quantity: bigint;
}) {
  const tx = new Transaction();

  const key = tx.moveCall({
    target: `${PREDICT_CONFIG.predictPackageId}::range_key::new`,
    arguments: [
      tx.pure.id(oracleId),
      tx.pure.u64(expiry),
      tx.pure.u64(lowerStrike),
      tx.pure.u64(higherStrike),
    ],
  });

  tx.moveCall({
    target: `${PREDICT_CONFIG.predictPackageId}::predict::redeem_range`,
    typeArguments: [PREDICT_CONFIG.dusdcType],
    arguments: [
      tx.object(PREDICT_CONFIG.predictObjectId),
      tx.object(managerId),
      tx.object(oracleId),
      key,
      tx.pure.u64(quantity),
      tx.object(SUI_CLOCK_OBJECT_ID),
    ],
  });

  return tx;
}
