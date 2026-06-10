# 0021: Combo Consecutive Streak and Single-Round Live PnL

Status: Accepted (streak rules amended by 0022-continuous-cash-out-and-streak-commitment.md)
Date: 2026-06-09

Supersedes the Combo portion of `0020-arena-privacy-social-loop.md`.

## Context

The first Combo design let users add any 3 quoted challenges into a draft slip and locked them together, with a score multiplier computed as the product of each leg's odds (`maxPayout / cost`). Two problems surfaced:

1. The slip was not tied to fixed round nodes. A user could stack 3 unrelated challenges, even 3 legs on the same oracle expiry. It did not feel like a real parlay across rounds.
2. The team also discussed making each leg a 5-minute node so 3 legs would fit inside one 15-minute settlement, to match the fast pace traders expect.

The core constraint blocks the 5-minute idea: DeepBook Predict only settles at an oracle expiry, and the shortest BTC expiry is 15 minutes. There is no on-chain price or settlement at the 5-minute or 10-minute mark. Judging 5-minute legs against the CryptoCompare chart price would contradict the project's stated boundary that chart price is reference only and never the settlement authority.

The product still needs to feel fast and high-stimulation without faking sub-15-minute on-chain settlement.

## Decision

Split fast feedback and the Combo mechanic into two layers.

### 1. Combo becomes a consecutive-round win streak

```text
1 leg = 1 real oracle expiry round (fixed, consecutive node)
Win a leg -> unlock the next leg, multiplier steps up
Lose any leg -> streak busts and resets to zero
3 consecutive wins -> 8x Arena score
```

Rules:

- Consecutive: leg `k+1` must be opened on the oracle expiry immediately following leg `k`. Skipping a round expires the streak.
- Direction free: each leg can be Above / Below / Range; it only needs to win.
- Order size: not restricted in MVP.
- After bust: the user may immediately start a new streak using the current round.
- Win / loss judgment reuses existing position status: `redeemable` = win, `lost` = loss (already derived in `usePredictPositions`).

Multiplier is fixed doubling: leg 1 win `2x`, leg 2 win `4x`, leg 3 win `8x`. Busting forfeits any lit multiplier; it does not carry over. The multiplier still applies to Arena score and reputation only, never on-chain payout.

### 2. Single-round live PnL

Within an in-progress round, show floating PnL on each open position card: `current exit value - cost basis`, refreshed on the existing polling cadence. This uses the live mark / `liveRedeem` value already available from the quote / simulate path. This gives moment-to-moment dopamine inside the 15-minute round so the fast-pace need is met by the single-trade layer, not by Combo.

## Rationale

A win streak fills the wait. The user is actively trading every round anyway, and the rising `2x -> 4x -> 8x` stakes plus the bust risk create escalating tension, which is more engaging than a one-shot locked slip. Each leg stays a real, settled DeepBook Predict position, so the demo remains technically honest.

Fixed doubling is simpler and more game-like than odds product, and we are free to choose it because Combo only affects Arena score.

Live PnL addresses the pacing concern directly: the 15-minute floor cannot be reduced for real on-chain legs, but the in-round experience stops being idle waiting.

## Consequences

Benefits:

- Combo is now a genuine cross-round parlay tied to fixed, consecutive, on-chain-settled nodes.
- The fast-pace requirement is met without faking sub-15-minute settlement.
- Multiplier logic is simpler and clearer for the demo.

Constraints:

- A full 3-leg streak takes at least three consecutive oracle rounds (~45 minutes). This is accepted; the streak framing makes the wait active rather than idle.
- Consecutive streaks depend on Predict testnet always queuing a next BTC expiry. If no next expiry exists, the streak must pause and the UI must say so honestly ("next oracle not ready"), not fake continuity.

Follow-up work:

- Refactor `lib/combo.ts` from a one-shot 3-leg slip into a streak model; change `getComboMultiplier` to `2^hits`.
- Rework `ComboPanel.tsx` into a streak progress UI (leg 1/2/3, multiplier lights, bust state).
- Update `TradePanel.tsx` so the combo action means "start / continue a streak with this order".
- Add live PnL display to `PositionsPanel.tsx` plus a hook for the live mark value.

## Alternatives Considered

### 5-minute product nodes, 3 legs inside one 15-minute oracle

Not selected for the real path because there is no on-chain settlement at 5 or 10 minutes. It could only exist as an explicitly labeled off-chain mini-game judged on chart price, which is out of scope for the honest on-chain demo.

### Same-expiry multi-leg combo

A single 15-minute oracle holding 3 different-strike legs that all settle at once. Not selected because the legs reveal simultaneously, which loses the sequential streak tension.

### Keep odds-product multiplier

Not selected because fixed doubling is more legible for users and the demo, and odds product gave noisy, hard-to-explain numbers.

## Revisit When

- DeepBook Predict exposes shorter expiries that could allow faster real legs.
- The team builds a real Parlay Vault / Bonus Pool for on-chain multiplied payout.
- An explicitly off-chain arena mini-game becomes a desired side mode.
