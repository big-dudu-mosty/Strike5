# 0014: Chart Trade Overlays

Status: Accepted
Date: 2026-06-03

## Context

Strike5 now supports both Quick Picks and Custom Builder inputs. Users can define a custom strike or range, but the chart previously only showed Oracle Spot. That made the trade preview less legible because users could not visually compare their selected strike / range against recent BTC price action.

## Decision

Strike5 will render the currently selected trade instrument on the BTC chart:

- Above / Below render one selected strike price line.
- Range renders lower and higher strike price lines.
- Oracle Spot remains visible as the settlement / quote reference line.
- The Trade Panel remains the source of the active `TradeQuoteRequest`; App lifts that request and passes a scaled chart overlay into `ChartPanel`.

## Rationale

This aligns the visual chart with the actual PTB parameters used for quote and mint. It also helps explain the product in a demo:

```text
selected card / custom input
-> generated MarketKey / RangeKey
-> same strike or range appears on chart
-> quote / mint uses the same request
```

## Consequences

Benefits:

- Users can visually verify the strike / range before minting.
- Custom Builder becomes easier to understand.
- The demo better communicates that DeepBook Predict is pricing arbitrary strike / range instruments.

Limitations:

- The range overlay is two price lines, not a shaded band.
- The chart does not yet support click-to-select strike.
- Only the current active oracle's selected instrument is displayed.

Follow-up work:

- Add a shaded range band if the chart library integration supports it cleanly.
- Add click-to-select strike on the chart.
- Add expiry markers if multiple expiries become selectable.

## Alternatives Considered

### Keep selected strikes only in the Trade Panel

Rejected. Users asked for K-line context, and short-cycle prediction requires visually comparing the selected instrument with price action.

### Draw permanent historical position overlays

Rejected for this milestone. The current need is pre-trade confirmation; historical position overlays can be added later from Positions data.

## Revisit When

- The app supports multiple active expiries.
- Custom Builder adds chart-click controls.
- We need visual overlays for historical positions.
