# 0012: Settled Position Redeem Flow

Status: Accepted
Date: 2026-06-02

## Context

Strike5 can create real DeepBook Predict positions and render indexed open positions in the Positions panel. The next end-to-end requirement is to let users handle positions after OracleSVI settlement.

DeepBook Predict provides:

```text
predict::redeem<dUSDC>
predict::redeem_range<dUSDC>
```

Both functions remove quantity from the user's `PredictManager` position ledger and deposit payout back into the same `PredictManager` balance.

## Decision

Strike5 will add settled-position actions in the Positions panel:

- `redeemable` positions show a `Redeem payout` action.
- `lost` positions show a `Clear lost position` action.
- `awaiting_settlement` positions do not show a transaction action yet.
- `active` positions do not show early exit in this milestone.

The PTB construction mirrors the existing mint flow:

```text
MarketKey / RangeKey
-> predict::redeem<dUSDC> or predict::redeem_range<dUSDC>
-> PredictManager balance refresh
-> Positions refresh
```

The transaction always redeems the current open quantity for the row.

## Rationale

This completes the core demo loop:

```text
deposit dUSDC
-> mint position
-> wait for settlement
-> redeem payout or clear loss
```

It also keeps the product behavior simple. DeepBook Predict supports live redeem before settlement, but Strike5 will avoid early exit until the UI can show a reliable live payout preview for both directional and range positions.

## Consequences

Benefits:

- The MVP now has an end-to-end trade lifecycle.
- Users can recover winning payouts into `PredictManager`.
- Users can clear losing settled positions so the manager state does not stay visually stale.

Limitations:

- Redeem is currently full-size only; partial redeem is not exposed.
- Active early exit is not exposed yet.
- Immediately after redeem, the position may remain visible until Predict Server indexes the redeem event.

Follow-up work:

- Add partial redeem quantity controls if needed.
- Add active early exit only after live quote preview is shown per position.
- Add a wallet withdrawal flow if the demo needs funds to leave `PredictManager`.

## Alternatives Considered

### Allow active positions to redeem immediately

Rejected for this milestone. Directional rows have mark value, but range rows do not yet have a reliable live mark in the panel. Enabling early exit without a clear preview would make the product harder to explain.

### Only show redeemable winners

Rejected. Losing settled positions still have open quantity in `PredictManager`; clearing them is useful and keeps the account display aligned with the on-chain manager state.

## Revisit When

- Range positions have live mark / bid preview.
- Custom Builder and partial sizing are implemented.
- The product adds a separate wallet withdrawal flow.
