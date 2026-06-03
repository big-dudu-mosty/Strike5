export const PREDICT_CONFIG = {
  network: 'testnet',
  suiRpcUrl: 'https://fullnode.testnet.sui.io:443',
  predictServerUrl: 'https://predict-server.testnet.mystenlabs.com',
  suiVisionTxBaseUrl: 'https://testnet.suivision.xyz/txblock',
  predictPackageId: '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138',
  predictObjectId: '0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a',
  dusdcPackageId: '0xe95040085976bfd54a1a07225cd46c8a2b4e8e2b6732f140a0fc49850ba73e1a',
  dusdcType:
    '0xe95040085976bfd54a1a07225cd46c8a2b4e8e2b6732f140a0fc49850ba73e1a::dusdc::DUSDC',
} as const;

export const PRODUCT_TIMING = {
  uiRoundMs: 5 * 60 * 1000,
  currentMinExpiryMs: 15 * 60 * 1000,
  openingCutoffMs: 90 * 1000,
} as const;

export const STRIKE_GRID = {
  minUsd: 50_000,
  maxUsd: 150_000,
  tickUsd: 1,
} as const;
