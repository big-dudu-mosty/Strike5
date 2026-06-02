# 0007: PredictManager Account Flow

Status: Accepted
Date: 2026-06-02

## Context

Strike5 needs a real user account entry before quote and mint flows can be implemented.

DeepBook Predict does not store positions as standalone wallet objects. A user first creates one shared `PredictManager`, deposits dUSDC into it, and then mints / redeems positions against that manager.

The app therefore needs to distinguish:

- wallet dUSDC balance
- PredictManager dUSDC balance
- indexed manager state from Predict Server
- transaction-confirmed manager creation from Sui RPC

## Decision

Milestone 4 will implement the account flow as:

1. Use `@mysten/dapp-kit-react` for wallet connection and signing.
2. Use the current Sui testnet client for wallet dUSDC balance via `getBalance`.
3. Use Predict Server `GET /managers?owner=<wallet_address>` to discover existing managers.
4. Select the newest indexed manager returned by Predict Server as the active manager.
5. Create a new manager by building a frontend PTB that calls:

```text
<predict_package>::predict::create_manager
```

6. Submit the PTB through wallet signing.
7. Wait for transaction confirmation through Sui RPC and parse `predict_manager::PredictManagerCreated` when available.
8. Refresh Predict Server-backed queries after the transaction.

## Rationale

This matches the architecture rule already defined for Strike5:

```text
Frontend builds PTB
-> Wallet signs
-> RPC submits / confirms transaction
-> Predict Server refreshes indexed view
```

Predict Server is appropriate for manager discovery and summary rendering because it already indexes `PredictManagerCreated`, manager balances, and position summaries.

Sui RPC remains the authority for the wallet transaction itself. The UI should not assume the server has indexed a newly created manager immediately after the wallet returns a tx digest.

## Consequences

Benefits:

- The user sees the correct split between wallet dUSDC and manager dUSDC.
- The app can proceed to deposit, quote, mint, and redeem using a stable manager id.
- The demo can show real DeepBook Predict account creation before opening trades.

Limitations:

- If Predict Server indexing lags, the UI can show the manager id from the confirmed transaction while summary values remain pending.
- If a wallet somehow has multiple managers, the app selects the newest one returned by the server. This follows current server ordering and the product expectation of one manager per user.

Follow-up work:

- Add dUSDC deposit into `PredictManager`.
- Add quote preview using `get_trade_amounts` / `get_range_trade_amounts`.
- Add mint and redeem flows using the selected manager id.

## Alternatives Considered

### Direct chain-only manager discovery

Rejected for MVP. `PredictManager` is a shared object and manager discovery is cleaner through indexed `PredictManagerCreated` events.

### Local-only manager id cache

Rejected as the primary source. Local cache can help bridge indexer lag after creation, but the long-term source should be Predict Server plus direct RPC confirmation where needed.

### Creating a manager automatically on wallet connect

Rejected. Creating a shared object costs gas and requires a wallet signature. It should be an explicit user action.

## Revisit When

- DeepBook Predict changes the manager creation entrypoint.
- Predict Server adds a dedicated single-manager endpoint by owner.
- Mainnet launch changes package ids, object ids, or indexer behavior.
