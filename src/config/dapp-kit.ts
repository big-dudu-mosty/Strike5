import { createDAppKit } from '@mysten/dapp-kit-react';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { PREDICT_CONFIG } from './predict';

const RPC_ENDPOINTS = {
  testnet: PREDICT_CONFIG.suiRpcUrl,
} as const;

export const dAppKit = createDAppKit({
  networks: ['testnet'],
  defaultNetwork: 'testnet',
  createClient(network) {
    return new SuiGrpcClient({
      baseUrl: RPC_ENDPOINTS[network as keyof typeof RPC_ENDPOINTS],
      network,
    });
  },
});

declare module '@mysten/dapp-kit-react' {
  interface Register {
    dAppKit: typeof dAppKit;
  }
}
