# 0015: PredictManager Withdrawal Flow

Status: Accepted
Date: 2026-06-03

## Context

Strike5 already supports depositing wallet dUSDC into a user's `PredictManager`, minting Predict positions, and redeeming settled positions back into the `PredictManager` balance. Without a withdrawal path, the funding loop stops inside the manager account.

For the demo, this can make the product feel incomplete because users can move funds into the trading account but cannot move unused dUSDC back to the wallet from the app.

## Decision

Add a manual `Withdraw from manager` action in the Account panel.

The frontend builds a PTB that calls:

```text
predict_manager::withdraw<dUSDC>(manager, amount)
```

The returned dUSDC coin is transferred to the connected wallet address in the same PTB.

## Rationale

This completes the visible funds lifecycle:

```text
Wallet dUSDC
-> PredictManager deposit
-> mint / mint_range
-> redeem / redeem_range
-> PredictManager balance
-> wallet withdrawal
```

The action is kept separate from mint and redeem because Predict positions spend and receive funds through `PredictManager`, while withdrawal is an account-level cash management action.

## Consequences

- Users can recover unused manager dUSDC without leaving Strike5.
- The Account panel now has symmetric deposit and withdrawal controls.
- Withdrawal depends on indexed manager summary data for balance validation.
- The transaction still requires wallet signing and the connected wallet must be the manager owner.

## Alternatives Considered

### Automatically withdraw after redeem

Rejected. Redeemed payout should stay in `PredictManager` by default so users can re-enter the next Predict round without another deposit.

### Combine deposit, mint, redeem, and withdraw into one smart flow

Rejected for MVP. Keeping cash movement explicit is easier to explain and reduces transaction complexity during the demo.

## Revisit When

- The product adds advanced wallet cash management.
- Users need one-click "redeem and withdraw" after settlement.
- The protocol or Predict Server exposes richer manager balance and cash history endpoints.
