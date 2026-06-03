# 0013: Custom Strike and Range Builder

Status: Accepted
Date: 2026-06-03

## Context

Strike5 initially supported quick-pick Above / Below / Range trades generated around the active OracleSVI spot. That is enough for fast demo trades, but the product thesis requires users to define their own strike or range instead of only accepting system-generated cards.

DeepBook Predict prices trades by `MarketKey` and `RangeKey`, so the frontend must convert user input into the active oracle's strike grid before quoting and minting.

## Decision

Strike5 will add a `Quick Picks / Custom` switch inside the Trade Panel.

In Custom mode:

- Above / Below use one user-entered strike.
- Range uses user-entered lower and higher strikes.
- Inputs accept BTC USD prices, including comma separators and decimals.
- Prices are converted to OracleSVI USD scale (`1e9`) and snapped to the active oracle tick size.
- Lower / higher range order is validated after snapping.
- The existing quote preview and mint transaction paths are reused.

## Rationale

This keeps the UX simple while making the product feel like a real prediction/options trading surface. Users can still use Quick Picks for speed, but custom strikes and ranges make the demo much more clearly tied to DeepBook Predict's programmable strike grid.

Reusing the existing quote and mint path avoids a separate transaction surface:

```text
Custom input
-> snap to active oracle grid
-> get_trade_amounts / get_range_trade_amounts
-> mint / mint_range
```

## Consequences

Benefits:

- Users can express their own directional or range view.
- The UI now demonstrates that Predict can price more than hand-listed binary outcomes.
- Quote and mint remain consistent because both use the same generated request.

Limitations:

- The builder currently targets the active oracle only.
- There is no advanced strike picker or chart-click selection yet.
- Inputs are blocked below the active oracle minimum strike.

Follow-up work:

- Add chart overlays for selected custom strike / range band.
- Add expiry selection if the app later supports multiple active oracle choices.
- Add preset buttons such as ATM, +/- 1 percent, and +/- 2 percent.

## Alternatives Considered

### Replace Quick Picks with Custom only

Rejected. Quick Picks are still useful for the short-cycle demo flow and for users who do not want to type prices.

### Let users submit unsnapped prices

Rejected. DeepBook Predict validates market and range keys against the oracle strike grid, so the UI should snap before quote and show the snapped instrument in preview.

## Revisit When

- The chart supports click-to-select strike.
- Multiple expiries are available in the UI.
- The protocol exposes a richer strike metadata endpoint.
