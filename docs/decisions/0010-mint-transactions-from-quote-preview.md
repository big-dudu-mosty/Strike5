# 0010: Mint Transactions From Quote Preview

Status: Accepted
Date: 2026-06-02

## Context

Strike5 now generates real DeepBook Predict quote previews for:

```text
Above
Below
Range
```

The next step is to turn the selected quote preview into a real opening transaction.

DeepBook Predict provides:

```text
predict::mint<dUSDC>
predict::mint_range<dUSDC>
```

Both require:

- `Predict`
- `PredictManager`
- `OracleSVI`
- `MarketKey` or `RangeKey`
- `quantity`
- `Clock`

The cost is withdrawn from the user's `PredictManager` balance.

## Decision

Strike5 will mint directly from the currently selected quote preview:

1. Reuse the same generated strike / range / quantity parameters used for quote preview.
2. For `Above` and `Below`, build a `MarketKey` with `market_key::new`.
3. For `Range`, build a `RangeKey` with `range_key::new`.
4. Submit:

```text
predict::mint<dUSDC>
```

for directional positions, and:

```text
predict::mint_range<dUSDC>
```

for range positions.

5. Require a loaded `PredictManager`.
6. Require loaded manager balance.
7. Disable mint near expiry using the existing opening cutoff.
8. Disable mint when quoted cost exceeds manager dUSDC balance.
9. After success, refresh:

```text
manager summary
market overview / vault summary
trade quote
```

## Rationale

This keeps the user-facing flow simple:

```text
choose Above / Below / Range
-> inspect fixed-risk quote
-> mint
```

It also keeps the technical flow aligned with the protocol's actual account model: `mint` spends from `PredictManager`, not from wallet dUSDC directly.

## Consequences

Benefits:

- The MVP can now open real DeepBook Predict positions.
- The quote preview and transaction parameters stay consistent.
- The demo can show a true end-to-end opening trade.

Limitations:

- The actual mint cost can still move between quote refresh and transaction execution if oracle / vault state changes.
- Position list rendering is not complete yet; the next milestone should load open positions from Predict Server.
- First-trade `deposit + mint` is still not combined into one PTB.

Follow-up work:

- Render minted positions in the Positions panel.
- Add redeem / redeem_range.
- Consider combined `deposit + mint` for first-time users after the separated flow is stable.

## Alternatives Considered

### Keep mint disabled until custom builder

Rejected. Quick Picks are enough to validate real mint transactions and fit the MVP demo.

### Build separate transaction forms for Above / Below / Range

Rejected. The quote preview already defines the active instrument; a single mint action is simpler.

### Auto-deposit missing dUSDC during mint

Rejected for this milestone. It is a useful UX improvement, but separated deposit and mint are easier to verify first.

## Revisit When

- Positions panel supports real open positions.
- Custom Builder supports user-defined strike and range.
- We decide to merge first-time deposit and mint into one PTB.
