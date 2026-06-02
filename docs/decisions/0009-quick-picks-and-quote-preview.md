# 0009: Quick Picks and Quote Preview

Status: Accepted
Date: 2026-06-02

## Context

Strike5's main trading surface should stay focused on the DeepBook Predict track:

```text
BTC K-line
-> active OracleSVI
-> Above / Below / Range
-> quote preview
-> mint / mint_range
```

Before sending real mint transactions, the UI needs to generate valid `MarketKey` / `RangeKey` values and ask the protocol for the current cost.

DeepBook Predict exposes read-only preview functions:

```text
predict::get_trade_amounts
predict::get_range_trade_amounts
```

Both return:

```text
(mint_cost, redeem_payout)
```

## Decision

For the first Trade Panel quote implementation:

1. Keep the primary choices as `Above`, `Below`, and `Range`.
2. Use the nearest active BTC oracle from Predict Server.
3. Use Oracle Spot as the anchor price.
4. Snap directional strikes to the oracle strike grid.
5. Use a default Range width of ±100 USD around Oracle Spot.
6. Use `1 dUSDC` as the default position size.
7. Interpret position size as DeepBook Predict `quantity`, where `1_000_000 = 1 dUSDC`.
8. Build a read-only PTB and call `simulateTransaction` with command results enabled.
9. Show:

```text
cost
max payout
live redeem
max loss
```

10. Keep mint disabled until the next milestone.

## Rationale

This keeps the product shape aligned with the original demo:

```text
user picks Above / Below / Range
-> user sees fixed-risk quote
-> user later confirms mint
```

It also keeps the frontend honest: quote values come from DeepBook Predict pricing functions, not from frontend formulas.

## Consequences

Benefits:

- The trade cards are no longer static.
- The user can inspect a real on-chain quote before mint is implemented.
- Later mint transactions can reuse the same generated key parameters.

Limitations:

- Quick Picks are still fixed policy, not a full custom builder.
- Range width is currently fixed at ±100 USD.
- The preview does not yet execute `mint` or `mint_range`.

Follow-up work:

- Add real mint / mint_range transaction submission.
- Add custom strike / range builder.
- Add selected strike and range overlays to the chart.
- Revisit default range width after demo testing.

## Alternatives Considered

### Price from frontend formulas

Rejected. DeepBook Predict pricing depends on OracleSVI, spread, utilization, and vault state. The protocol preview should be the source of truth.

### Implement custom builder first

Rejected for MVP sequencing. Quick Picks let us validate quote and later mint flows with less UI complexity.

### Start with only Above / Below

Rejected. Range is an important DeepBook Predict primitive and should be visible early in the demo.

## Revisit When

- Custom Builder is implemented.
- User testing shows ±100 USD is too wide or too narrow.
- DeepBook Predict adds a server-side quote endpoint.
