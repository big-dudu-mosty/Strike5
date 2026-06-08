# 0020: Arena Privacy Social Loop

Status: Accepted
Date: 2026-06-08

## Context

The previous product direction positioned Strike5 as a chart-first BTC fixed-risk trading terminal. That direction correctly matched DeepBook Predict's current testnet capability, but the product felt too thin: users could only make BTC Above / Below / Range predictions and then wait for settlement.

Adding ETH, SUI, SOL, sports, or news events would make the product look broader, but those markets are not valid unless DeepBook Predict testnet provides corresponding oracles and settlement paths. Building fake markets would weaken the hackathon demo and move the project away from the DeepBook Predict track.

The project needs more product depth without overstating protocol capability.

## Decision

Reposition Strike5 as **Strike5 Arena**, a privacy-aware BTC prediction arena powered by DeepBook Predict.

The product remains based on the current real BTC Predict flow:

```text
BTC OracleSVI
-> quote
-> mint / mint_range
-> PredictManager position accounting
-> settlement
-> redeem / redeem_range
```

The product layer adds:

- Round Arena: each active BTC expiry is treated as a prediction round.
- Opt-in Leaderboard: only users who explicitly opt in are displayed.
- Social Feed: users can publish calls and verified showcases.
- Sealed Calls: users can publish encrypted pre-settlement calls and reveal them after settlement.
- Combo: users can chain multiple rounds for Arena score multipliers.

## Rationale

This keeps the demo technically honest while making the product less monotonous.

Round Arena creates a repeatable user loop. Leaderboards and showcases create social distribution. Sealed Calls bring in Sui's privacy stack in a way that fits prediction markets: users can prove they made a call before settlement without exposing it before the round closes. Combo adds retention without requiring a new money-market risk pool.

The direction remains highly aligned with DeepBook Predict because every paid prediction still maps to native Predict positions and ranges.

## Consequences

Benefits:

- The product no longer feels like a single BTC trading panel.
- The demo still uses real DeepBook Predict mint / redeem flows.
- The privacy story is useful and bounded instead of decorative.
- The commercial loop is clearer: more rounds, more mint / redeem activity, more dUSDC usage, more PredictManager creation, and more social retention.

Constraints:

- ETH / SUI / SOL markets stay out of scope until real Predict oracles exist.
- Sealed Calls hide social prediction content, not underlying mint / redeem transactions.
- Combo multiplies Arena score and reputation only; it does not multiply on-chain payout.
- Leaderboard privacy is opt-in aggregation, not private transaction privacy.

Follow-up work:

- Update the product spec, demo plan, roadmap, and README.
- Implement Round Arena UI.
- Implement opt-in leaderboard state.
- Implement verified calls / showcases.
- Spike Sui Seal integration for Sealed Calls.
- Design Combo score calculation.

## Alternatives Considered

### Add ETH / SUI / SOL predictions

Not selected for MVP because the team has not confirmed official DeepBook Predict testnet oracles for those assets. Fake oracle markets would damage technical credibility.

### Add arbitrary news / sports / political markets

Not selected because these require event-specific oracle and settlement logic outside current DeepBook Predict BTC capability.

### Keep the product as a trading terminal

Not selected because the product loop felt too shallow for a hackathon demo and did not clearly show user retention or commercial growth mechanics.

### Implement real-money parlay immediately

Not selected because true parlay payout requires a new ticket contract, bonus pool or vault, odds model, settlement rules, and risk controls. MVP Combo remains a score multiplier.

## Revisit When

- DeepBook Predict exposes additional official testnet or mainnet oracles.
- The team has bandwidth to build a real Parlay Vault / Bonus Pool.
- Sui Seal integration is stable enough for production use in the app.
- A verified scoring backend or Nautilus TEE integration becomes necessary for trust-minimized leaderboards.
