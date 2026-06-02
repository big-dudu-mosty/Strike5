import type { SuiClientTypes } from '@mysten/sui/client';
import { bcs } from '@mysten/sui/bcs';
import {
  buildDirectionalQuoteTransaction,
  buildRangeQuoteTransaction,
} from './transactions';

const PREVIEW_SENDER = '0x0000000000000000000000000000000000000000000000000000000000000000';

export type TradeKind = 'above' | 'below' | 'range';

export interface DirectionalQuoteRequest {
  kind: 'above' | 'below';
  expiry: bigint;
  oracleId: string;
  quantity: bigint;
  strike: bigint;
}

export interface RangeQuoteRequest {
  kind: 'range';
  expiry: bigint;
  higherStrike: bigint;
  lowerStrike: bigint;
  oracleId: string;
  quantity: bigint;
}

export type TradeQuoteRequest = DirectionalQuoteRequest | RangeQuoteRequest;

export interface TradeQuote {
  cost: bigint;
  liveRedeem: bigint;
  maxPayout: bigint;
}

type QuoteClient = {
  simulateTransaction: <Include extends SuiClientTypes.SimulateTransactionInclude>(
    options: SuiClientTypes.SimulateTransactionOptions<Include>,
  ) => Promise<SuiClientTypes.SimulateTransactionResult<Include>>;
};

export async function quotePredictTrade(
  client: QuoteClient,
  request: TradeQuoteRequest,
): Promise<TradeQuote> {
  const transaction =
    request.kind === 'range'
      ? buildRangeQuoteTransaction({ ...request, sender: PREVIEW_SENDER })
      : buildDirectionalQuoteTransaction({
          ...request,
          isUp: request.kind === 'above',
          sender: PREVIEW_SENDER,
        });

  const result = await client.simulateTransaction({
    transaction,
    include: { commandResults: true },
    checksEnabled: false,
  });
  const tx = result.$kind === 'Transaction' ? result.Transaction : result.FailedTransaction;

  if (!tx.status.success) {
    throw new Error(tx.status.error?.message ?? 'Trade quote failed.');
  }

  const quoteCommand = result.commandResults?.[1];
  const cost = parseU64ReturnValue(quoteCommand?.returnValues[0]?.bcs);
  const liveRedeem = parseU64ReturnValue(quoteCommand?.returnValues[1]?.bcs);

  return {
    cost,
    liveRedeem,
    maxPayout: request.quantity,
  };
}

function parseU64ReturnValue(bytes: Uint8Array | null | undefined) {
  if (!bytes) {
    throw new Error('Trade quote response missing return value.');
  }

  return BigInt(bcs.U64.parse(bytes));
}
