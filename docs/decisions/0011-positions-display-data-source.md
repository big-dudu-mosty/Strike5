# 0011: Positions Display Data Source

Status: Accepted
Date: 2026-06-02

## Context

Strike5 can now mint real DeepBook Predict positions from quote preview. The next user-facing requirement is to show what the user opened inside the Positions panel.

DeepBook Predict stores binary positions and ranges inside the user's `PredictManager`. They are not standalone wallet objects. The UI therefore needs an indexed view of the manager's position quantities and settlement state.

## Decision

Strike5 will load Positions panel data from the public Predict Server:

```text
/managers/:manager_id/positions/summary
/managers/:manager_id/ranges
/predicts/:predict_id/oracles
```

Directional `Above` / `Below` positions will use `/positions/summary` directly because the server already returns:

- open quantity
- cost basis
- mark value
- realized / unrealized PnL
- status

Range positions will be aggregated in the frontend from `/ranges` mint and redeem events because there is no current range summary endpoint. The frontend groups range events by:

```text
oracle_id + expiry + lower_strike + higher_strike
```

The frontend derives range status as:

- `redeemed` when open quantity is zero.
- `redeemable` when the oracle is settled and settlement price is inside the range.
- `lost` when the oracle is settled and settlement price is outside the range.
- `awaiting_settlement` when expiry has passed but oracle is not settled.
- `active` before expiry.

## Rationale

This keeps the implementation aligned with the current DeepBook Predict testnet API while avoiding incorrect wallet-object assumptions.

Using `/positions/summary` for directional rows gives the most accurate currently available indexed mark and PnL values. Aggregating range rows is acceptable for MVP because range mint/redeem events contain the required strike, quantity, cost, payout, and timestamp fields.

## Consequences

Benefits:

- The user can see real opened positions after mint.
- Directional position status follows the official Predict Server summary logic.
- Range positions are visible without waiting for a new server endpoint.

Limitations:

- Range mark value is not available yet, so the panel shows range cost basis and realized payout instead of live range mark.
- The Positions panel is still indexer-backed; immediately after a transaction, rows may appear only after Predict Server indexes the event.
- Final transaction-critical actions still need Sui RPC / PTB confirmation when redeem is implemented.

Follow-up work:

- Add `redeem<dUSDC>` for directional positions.
- Add `redeem_range<dUSDC>` for range positions.
- Consider a range summary endpoint if the backend exposes one later.

## Alternatives Considered

### Parse `PredictManager` directly through Sui RPC

Rejected for this milestone. The manager object layout is more complex, and Predict Server already exposes indexed manager views suitable for the UI.

### Hide Range positions until backend has summary support

Rejected. Range is a core product mode, so users should see range positions after opening them even if live mark value is not available yet.

## Revisit When

- Predict Server adds a range summary endpoint.
- Redeem transactions require more exact per-position settlement metadata.
- Mainnet deployment changes endpoint shapes or status semantics.
