# 0008: Separate dUSDC Deposit Before Mint

Status: Superseded by 0016-direct-order-auto-top-up.md
Date: 2026-06-02

## Context

DeepBook Predict mints positions against quote balance stored inside `PredictManager`.

A user can hold dUSDC in their wallet, but that wallet balance is not automatically available for `predict::mint` or `predict::mint_range`. The dUSDC must first be deposited into the selected `PredictManager` through `predict_manager::deposit<dUSDC>`.

The current Strike5 UI already shows this separation:

```text
Wallet dUSDC
Manager dUSDC
```

The next implementation step must make that split actionable before quote and mint flows are added.

## Decision

For MVP, Strike5 will use a separate explicit deposit action:

```text
Wallet dUSDC
-> user enters amount
-> frontend builds PTB
-> wallet signs
-> predict_manager::deposit<dUSDC>
-> Manager dUSDC increases
```

The deposit transaction uses the current selected `PredictManager` and the current testnet dUSDC coin type.

The UI validates that:

- a wallet is connected
- a `PredictManager` exists
- the app is on Sui testnet
- the amount is positive
- the amount has at most 6 decimals
- the amount does not exceed wallet dUSDC balance

## Rationale

Separating deposit from mint keeps the MVP easier to reason about:

- The user can see why wallet dUSDC is different from manager dUSDC.
- The demo can show the real DeepBook Predict account funding step.
- Quote and mint flows can assume a funded manager balance.
- Failed deposits are isolated from quote / mint failures.

This also avoids hiding a meaningful protocol primitive inside a larger combined transaction too early.

## Consequences

Benefits:

- Clearer UX for explaining DeepBook Predict's account model.
- Simpler transaction construction for the next milestone.
- Easier debugging when user funding is missing.

Limitations:

- Users need one extra transaction before their first trade.
- Later production UX may want an optional combined `deposit + mint` PTB for first-time users.

Follow-up work:

- Add quote preview for Above / Below / Range.
- Use manager dUSDC balance to validate trade amount before mint.
- Consider a combined first-trade PTB after the separated flow is stable.

## Alternatives Considered

### Combine deposit and mint immediately

Rejected for MVP. It would reduce clicks, but it would also make failures harder to explain and would obscure the account model during the hackathon demo.

### Auto-deposit all wallet dUSDC

Rejected. The user should decide how much wallet balance to move into `PredictManager`.

### Skip deposit UI and only show an error before mint

Rejected. That would make the first real trade path confusing because users could have wallet dUSDC but still be unable to mint.

## Revisit When

- The quote and mint flow is fully working.
- The demo needs a lower-click first-trade path.
- DeepBook Predict changes the funding model for `PredictManager`.
