# 0022: Continuous Cash-Out Trading and Streak Commitment Rule

Status: Accepted
Date: 2026-06-10

Amends `0021-combo-consecutive-streak-and-live-pnl.md` (streak rules) and retires the 5-minute product round defined in `0001-mvp-architecture-baseline.md`.

## Context

Two pressures converged:

1. **Pace.** The product assumed a "5-minute UI round on top of a 15-minute oracle expiry". Live testnet inspection showed the 15-minute BTC oracle feed is not currently running; only daily-expiry (and longer) BTC oracles are active. If pace depends on settlement frequency, the product is unplayably slow, and the 5-minute round was always a fiction layered over the real expiry.
2. **Conflict with Combo.** Once a fast exit path exists, it appears to conflict with the streak parlay, which is a bet-like commitment that should not be reversible at will.

Reading the contract source (`predict-testnet-4-16` branch, `packages/predict/sources/predict.move` and `oracle_config.move`) resolved both.

### Verified contract facts

- `predict::redeem` / `predict::redeem_range` have an explicit **unsettled branch**: the position is removed from the vault and paid out at the **live bid** (post-spread, quoted against post-trade state). Early exit before settlement is a first-class protocol capability, not a workaround.
- The exit window is defined by `assert_quoteable_oracle`:
  - `ACTIVE` + price pushed within the 30s staleness threshold → redeem allowed at live bid.
  - `PENDING_SETTLEMENT` (expired but not yet settled) → **intentionally frozen**; no redeem until settlement.
  - `SETTLED` → redeem at settlement fair price (existing flow).
- `trading_paused` gates `mint` / `mint_range` only. **Redeem is never gated by the pause flag** — users can always exit even when opening is paused.
- Exit pricing includes the vault spread (bid below fair price), which naturally discourages zero-edge instant churn without any app-level restriction.

## Decision

### 1. Retire the 5-minute product round

There is no fixed product round cadence anymore. The trading loop is **continuous**:

```text
mint anytime while the oracle is live
-> watch live PnL tick (decision 0021)
-> cash out anytime at the live bid, or hold to settlement
```

The oracle expiry is demoted from "pace source" to **settlement anchor**: it is where streak legs are judged and where reveal/redeem ceremonies happen. Long-dated oracles are no longer a defect; they are an always-open arena. The opening cutoff near expiry (90s) remains for minting.

### 2. Cash Out button for open positions

Active positions get an explicit "Cash Out" action that reuses the existing redeem PTB builders. UI states mirror the contract exactly:

```text
ACTIVE + fresh (≤30s)      -> Cash Out enabled, shows current live exit value
oracle stale (>30s)        -> Cash Out temporarily disabled, explain why
PENDING_SETTLEMENT         -> frozen, "awaiting settlement", no exit
SETTLED                    -> existing redeem / clear-lost flow
```

### 3. Streak commitment rule: cash-out = surrender

The streak (decision 0021) is a commitment, like a parlay ticket. The two modes coexist on the same on-chain position type, differentiated only at the app layer:

```text
Normal position  = trading mode   -> cash out freely, no strings attached
Streak leg       = commitment mode -> must be held to settlement to count
```

- Cashing out a streak leg before settlement marks the leg **surrendered** and ends the streak.
- Surrender is a **neutral terminal state**: it is not a loss, it does not count as a miss in leaderboard stats, and it does not light any multiplier. It simply forfeits the streak.
- No time-window lock is needed. Even a near-certain winner that exits early forfeits the streak, so there is no exploitable "cash out at 99% certainty and keep the win" path. This replaces any "lock N minutes before expiry" rule.
- The UI must warn before cashing out a streak leg ("this forfeits your streak").
- Detection is app-layer: a streak leg whose position quantity decreases before its oracle settles is surrendered.

## Rationale

The pace problem is solved by the protocol itself: the vault is a continuous counterparty with mark-to-market quoting, so pace belongs to the user, not to the settlement calendar. This also makes the demo independent of which expiries the testnet happens to be running — a full open → PnL tick → cash out loop takes seconds on a daily oracle.

The conflict with Combo dissolves once roles are explicit: cash-out provides the fast dopamine loop; the streak provides the high-commitment reputation loop. "You can always run, but running forfeits the streak" is itself the tension that makes the streak engaging.

Surrender as a neutral state (not a loss) keeps stats honest: abandoning a commitment and being wrong are different things.

## Consequences

Benefits:

- Pace is decoupled from settlement frequency; the product works today on daily oracles and gets better automatically if short expiries return.
- Demonstrates a protocol capability (live exit against the vol-surface bid) that the official narrative does not emphasize — strong hackathon signal.
- No fake sub-settlement rounds anywhere in the product or copy.
- Exit is even available when trading is paused, which is user-protective and worth stating.

Constraints:

- Early exit pays the bid (spread cost); UI should show the live exit value so the cost is visible, not hidden.
- The expired-but-unsettled gap freezes positions; the UI must present this honestly instead of showing a dead Cash Out button.
- Surrender detection relies on indexer-visible quantity changes; indexer lag may briefly show a stale streak state.

Follow-up work:

- Remove `PRODUCT_TIMING.uiRoundMs` and 5-minute round copy from config, UI, and docs.
- Add Cash Out to `PositionsPanel` for `active` positions (reuse redeem PTBs + live quote already built in 0021 work).
- Add surrender state to the streak model in `lib/combo.ts` and the warning flow in the UI.
- Update demo plan: the core demo beat becomes the 30-second open → tick → cash out loop.

## Alternatives Considered

### Keep the 5-minute UI round

Rejected. It was always a fiction over the real expiry, and with only daily oracles live it became misleading. Continuous trading is both more honest and faster.

### Lock streak legs only near expiry (betting-style cut-off window)

Rejected. On-chain positions cannot be "edited" anyway; the only action is early redeem. Making any early redeem forfeit the streak is simpler, airtight against last-minute certainty exploits, and needs no extra timing rules.

### Count profitable cash-outs as streak wins

Rejected for now. It redefines the streak as "consecutive profitable exits", which is gameable (exit on any tiny uptick) and severs the link to oracle settlement that anchors the streak to DeepBook Predict. May be revisited as a separate fast-lane game mode.

### Treat surrender as a loss (bust)

Rejected. Conflates abandoning a commitment with being wrong; would pollute win-rate stats and discourage rational profit-taking on non-streak intentions.

## Revisit When

- Short-expiry (15m) oracle feeds return to testnet or appear on mainnet, enabling faster settlement anchors for streaks.
- A real-money parlay vault is designed (would need its own lock semantics).
- A "profit-exit streak" fast mode is considered as a separate, clearly-labeled game.
