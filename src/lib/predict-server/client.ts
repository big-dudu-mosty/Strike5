import { PREDICT_CONFIG } from '../../config/predict';
import type {
  PredictMarketOverview,
  PredictManagerCreated,
  PredictManagerPositions,
  PredictManagerPositionSummary,
  PredictManagerRanges,
  PredictManagerSummary,
  PredictOracle,
  PredictOracleState,
  PredictProtocolState,
  PredictVaultSummary,
} from './types';

const PREDICT_ID = PREDICT_CONFIG.predictObjectId;

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${PREDICT_CONFIG.predictServerUrl}${path}`);

  if (!response.ok) {
    throw new Error(`Predict Server request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export function fetchPredictOracles() {
  return fetchJson<PredictOracle[]>(`/predicts/${PREDICT_ID}/oracles`);
}

export function fetchPredictState() {
  return fetchJson<PredictProtocolState>(`/predicts/${PREDICT_ID}/state`);
}

export function fetchVaultSummary() {
  return fetchJson<PredictVaultSummary>(`/predicts/${PREDICT_ID}/vault/summary`);
}

export function fetchOracleState(oracleId: string) {
  return fetchJson<PredictOracleState>(`/oracles/${oracleId}/state`);
}

export function fetchPredictManagers(owner: string) {
  const query = new URLSearchParams({ owner });
  return fetchJson<PredictManagerCreated[]>(`/managers?${query.toString()}`);
}

export function fetchPredictManagerSummary(managerId: string) {
  return fetchJson<PredictManagerSummary>(`/managers/${managerId}/summary`);
}

export function fetchPredictManagerPositionSummary(managerId: string) {
  return fetchJson<PredictManagerPositionSummary[]>(
    `/managers/${managerId}/positions/summary`,
  );
}

export function fetchPredictManagerPositions(managerId: string) {
  return fetchJson<PredictManagerPositions>(`/managers/${managerId}/positions`);
}

export function fetchPredictManagerRanges(managerId: string) {
  return fetchJson<PredictManagerRanges>(`/managers/${managerId}/ranges`);
}

export async function fetchPredictMarketOverview(now = Date.now()): Promise<PredictMarketOverview> {
  const [predictState, vaultSummary, oracles] = await Promise.all([
    fetchPredictState(),
    fetchVaultSummary(),
    fetchPredictOracles(),
  ]);

  const activeOracles = getActiveBtcOracles(oracles, now);
  const activeOracle = activeOracles[0] ?? null;
  const nextOracle = activeOracles[1] ?? null;
  const oracleState = activeOracle ? await fetchOracleState(activeOracle.oracle_id) : null;

  return {
    predictState,
    vaultSummary,
    oracles,
    activeOracles,
    activeOracle,
    nextOracle,
    oracleState,
    fetchedAt: Date.now(),
  };
}

function getActiveBtcOracles(oracles: PredictOracle[], now: number) {
  return oracles
    .filter((oracle) => {
      return (
        oracle.underlying_asset === 'BTC' &&
        oracle.status === 'active' &&
        oracle.expiry > now &&
        oracle.settlement_price === null
      );
    })
    .sort((a, b) => a.expiry - b.expiry);
}
