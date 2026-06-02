export type OracleStatus = 'active' | 'inactive' | 'pending_settlement' | 'settled' | string;

export interface PredictOracle {
  predict_id: string;
  oracle_id: string;
  oracle_cap_id: string;
  underlying_asset: string;
  expiry: number;
  min_strike: number;
  tick_size: number;
  status: OracleStatus;
  activated_at: number | null;
  settlement_price: number | null;
  settled_at: number | null;
  created_checkpoint: number;
}

export interface PredictPriceEvent {
  event_digest: string;
  digest: string;
  sender: string;
  checkpoint: number;
  checkpoint_timestamp_ms: number;
  tx_index: number;
  event_index: number;
  package: string;
  oracle_id: string;
  spot: number;
  forward: number;
  onchain_timestamp: number;
}

export interface PredictSviEvent {
  event_digest: string;
  digest: string;
  sender: string;
  checkpoint: number;
  checkpoint_timestamp_ms: number;
  tx_index: number;
  event_index: number;
  package: string;
  oracle_id: string;
  a: number;
  b: number;
  rho: number;
  rho_negative: boolean;
  m: number;
  m_negative: boolean;
  sigma: number;
  onchain_timestamp: number;
}

export interface PredictOracleState {
  oracle: PredictOracle;
  latest_price: PredictPriceEvent | null;
  latest_svi: PredictSviEvent | null;
  ask_bounds: unknown | null;
}

export interface PredictProtocolState {
  predict_id: string;
  pricing: unknown | null;
  risk: unknown | null;
  trading_paused: boolean | null;
  quote_assets: string[];
}

export interface PredictVaultSummary {
  predict_id: string;
  quote_assets: string[];
  vault_balance: number;
  vault_value: number;
  total_mtm: number;
  total_max_payout: number;
  available_liquidity: number;
  available_withdrawal: number;
  plp_total_supply: number;
  plp_share_price: number;
  utilization: number;
  max_payout_utilization: number;
  net_deposits: number;
  total_supplied: number;
  total_withdrawn: number;
}

export interface PredictMarketOverview {
  predictState: PredictProtocolState;
  vaultSummary: PredictVaultSummary;
  oracles: PredictOracle[];
  activeOracles: PredictOracle[];
  activeOracle: PredictOracle | null;
  nextOracle: PredictOracle | null;
  oracleState: PredictOracleState | null;
  fetchedAt: number;
}

export interface PredictManagerCreated {
  event_digest: string;
  digest: string;
  sender: string;
  checkpoint: number;
  checkpoint_timestamp_ms: number;
  tx_index: number;
  event_index: number;
  package: string;
  manager_id: string;
  owner: string;
}

export interface PredictAssetBalanceSummary {
  quote_asset: string;
  balance: number;
}

export interface PredictManagerSummary {
  manager_id: string;
  owner: string;
  balances: PredictAssetBalanceSummary[];
  trading_balance: number;
  open_exposure: number;
  redeemable_value: number;
  realized_pnl: number;
  unrealized_pnl: number;
  account_value: number;
  open_positions: number;
  awaiting_settlement_positions: number;
}

export type PredictPositionStatus =
  | 'active'
  | 'awaiting_settlement'
  | 'redeemable'
  | 'lost'
  | 'redeemed'
  | string;

export interface PredictManagerPositionSummary {
  predict_id: string;
  manager_id: string;
  quote_asset: string;
  oracle_id: string;
  underlying_asset: string | null;
  expiry: number;
  strike: number;
  is_up: boolean;
  minted_quantity: number;
  redeemed_quantity: number;
  open_quantity: number;
  total_cost: number;
  total_payout: number;
  realized_pnl: number;
  unrealized_pnl: number;
  open_cost_basis: number;
  average_entry_price: number | null;
  average_exit_price: number | null;
  mark_price: number | null;
  mark_value: number | null;
  status: PredictPositionStatus;
  first_minted_at: number;
  last_activity_at: number;
}

export interface PredictRangeMinted {
  event_digest: string;
  digest: string;
  sender: string;
  checkpoint: number;
  checkpoint_timestamp_ms: number;
  tx_index: number;
  event_index: number;
  package: string;
  predict_id: string;
  manager_id: string;
  trader: string;
  quote_asset: string;
  oracle_id: string;
  expiry: number;
  lower_strike: number;
  higher_strike: number;
  quantity: number;
  cost: number;
  ask_price: number;
}

export interface PredictRangeRedeemed {
  event_digest: string;
  digest: string;
  sender: string;
  checkpoint: number;
  checkpoint_timestamp_ms: number;
  tx_index: number;
  event_index: number;
  package: string;
  predict_id: string;
  manager_id: string;
  trader: string;
  quote_asset: string;
  oracle_id: string;
  expiry: number;
  lower_strike: number;
  higher_strike: number;
  quantity: number;
  payout: number;
  bid_price: number;
  is_settled: boolean;
}

export interface PredictManagerRanges {
  minted: PredictRangeMinted[];
  redeemed: PredictRangeRedeemed[];
}
