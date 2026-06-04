# 0019: Consumer Demo Surface Simplification

Status: Accepted
Date: 2026-06-04

## Context

Strike5's primary hackathon demo is a consumer-facing BTC fixed-risk trading terminal:

```text
look at BTC chart
-> choose Above / Below / Range
-> enter order size
-> open the position directly
-> redeem after OracleSVI settlement
```

After direct order auto top-up was implemented, the visible manual `deposit` / `withdraw` controls in the Account panel created the wrong product impression: users could think they must recharge a platform balance before trading.

The top status tiles and the Vault & Oracle Health panel also made the first screen feel more like a protocol dashboard than a focused trading product.

## Decision

Strike5 will simplify the primary demo surface:

- Remove visible manual `deposit` and `withdraw` controls from the Account panel.
- Keep Account panel focused on wallet, network, wallet dUSDC, PredictManager, Manager dUSDC, account value, and open positions.
- Keep direct order placement in the Trade Panel as the primary funding path.
- If Manager dUSDC is below the user-entered order size, the mint PTB still auto-reserves the deficit from wallet dUSDC before calling `mint` / `mint_range`.
- Remove the top four info tiles from the primary layout.
- Remove the Vault & Oracle Health panel from the primary layout.
- Keep Vault / PLP data as protocol context for docs, pitch, and possible future professional mode.
- Expand BTC K-line lookback so users can inspect history before the current day.

The K-line provider remains CryptoCompare. The current client uses:

```text
1m  -> 1440 candles, about 24 hours
5m  -> 2000 candles, about 7 days
15m -> 2000 candles, about 20 days
```

## Rationale

This better matches the product story:

- Users directly open positions instead of learning a separate cash-management workflow.
- The first screen emphasizes chart, market pulse, trade panel, and positions.
- Protocol details are still honest because Account panel shows `PredictManager` state and Trade Panel explains auto top-up behavior.
- Vault / PLP is important to DeepBook Predict, but it is not necessary for a user deciding a short-cycle BTC direction or range.
- Longer K-line history supports short-cycle decision making without pretending the chart price is the settlement source.

## Consequences

Benefits:

- Demo flow is easier to explain and test.
- The UI aligns with the planned final product logic.
- The risk of users clicking manual deposit / withdrawal during demo is removed.
- The K-line chart becomes useful for historical context beyond the current session.

Limitations:

- Users cannot manually withdraw unused Manager dUSDC from the primary UI, even though the lower-level withdrawal transaction builder still exists.
- Vault / PLP risk numbers are no longer visible on the main screen.
- CryptoCompare minute history is bounded by provider response limits, so the chart is a wider short-cycle lookback, not infinite historical data.

## Alternatives Considered

### Keep manual cash controls visible

Rejected. It is technically accurate but conflicts with the direct-order product flow.

### Keep Vault Health on the right sidebar

Rejected for MVP. It is useful for protocol education but distracts from the user trading flow.

### Move every protocol detail into a modal

Deferred. For the hackathon demo, removing non-essential panels is simpler and clearer.

## Revisit When

- Strike5 adds a professional mode.
- Users need explicit cash-management tools after real mainnet use.
- The demo includes a dedicated DeepBook Predict liquidity / PLP explanation segment.
