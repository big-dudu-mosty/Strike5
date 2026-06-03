# 0016: Direct Order Auto Top-Up

Status: Accepted
Date: 2026-06-03

## Context

Strike5's product logic is that users enter the platform, choose `Above`, `Below`, or `Range`, inspect the fixed-risk quote, and place the order directly from the Trade Panel.

DeepBook Predict's protocol model still requires quote funds to be held in the user's `PredictManager` before `predict::mint` or `predict::mint_range` can spend them. The earlier MVP implementation exposed this as a manual funding step:

```text
wallet dUSDC
-> manual deposit to PredictManager
-> mint
```

That was useful for validating the protocol account model, but it is not the final user experience we want for the demo.

## Decision

For users who already have a `PredictManager`, Strike5 will support direct order placement from the Trade Panel.

The user decides the order size in the Trade Panel. Strike5 does not choose a fixed trade amount for the user.

When the user-entered size is higher than the current Manager dUSDC balance, the frontend computes the reserve deficit:

```text
top_up = user_entered_size - manager_dUSDC
```

If wallet dUSDC is sufficient, the mint PTB includes both steps:

```text
predict_manager::deposit<dUSDC>(manager, top_up_coin)
predict::mint<dUSDC> / predict::mint_range<dUSDC>
```

This makes the user-facing action:

```text
choose trade
-> click open
-> one wallet signature
-> deposit deficit and mint in the same PTB
```

Manual deposit remains available in the Account panel as an optional funds-management tool, not as a required pre-trade step.

The app reserves up to the user-entered size instead of only the preview quote cost because `predict::mint` calculates the actual mint cost on-chain at execution time after current vault exposure is considered. Any dUSDC that is deposited but not spent by `mint` remains in the `PredictManager` for the next order or withdrawal.

## Rationale

This aligns the product with the planned Strike5 experience:

- Users do not need to understand or perform a separate recharge step before every trade.
- The demo still remains technically honest because the PTB uses the real `PredictManager` funding model.
- The platform can explain that `PredictManager` is the on-chain trading account while keeping the primary UX focused on the trade itself.

## Consequences

Benefits:

- The primary trading flow now feels like direct order placement.
- Manager dUSDC no longer blocks mint if wallet dUSDC can cover the deficit.
- A single wallet signature can reserve the missing amount and open the position.
- Mint transactions are preflighted with `simulateTransaction` before wallet signing so funding failures can be surfaced as product errors instead of raw Move aborts.

Limitations:

- A first-time user still needs a `PredictManager` before mint, because `predict::create_manager` returns an ID and the newly shared manager object is not passed into `mint` in the same PTB.
- If both Manager dUSDC and wallet dUSDC are insufficient, the Trade Panel blocks the order.
- Quote cost can still change between preview and transaction execution because Predict pricing is live.

## Alternatives Considered

### Keep manual deposit as the only path

Rejected. It accurately exposes the protocol primitive but does not match the intended product logic of direct trading.

### Auto-deposit all wallet dUSDC

Rejected. The app should only move the deficit required for the selected quote, not sweep the user's wallet balance.

### Hide PredictManager completely

Rejected for the hackathon demo. The product should keep the protocol model legible while making it ergonomic.

## Revisit When

- The protocol exposes a way to create and immediately use a manager object in one transaction.
- Strike5 adds a first-run onboarding modal that creates the manager before the first trade.
- The product adds more advanced order sizing or cash-management behavior.
