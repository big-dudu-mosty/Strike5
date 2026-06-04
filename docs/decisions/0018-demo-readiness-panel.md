# 0018: Demo Readiness Panel

Status: Accepted
Date: 2026-06-04

## Context

Strike5 now has the core trading loop working, but the live demo still depends on several prerequisites being correct at the same time:

```text
wallet connected
Sui testnet selected
dUSDC available
PredictManager created
active OracleSVI available
BTC chart loaded
redeemable or lost positions available for settlement demo
```

Without a consolidated checklist, it is easy to start a demo while one prerequisite is missing and then lose time diagnosing UI state in front of judges.

## Decision

Add a read-only `Demo Readiness` panel to the right sidebar.

The panel checks:

- Wallet connection.
- Current network.
- Spendable dUSDC across wallet and manager.
- PredictManager presence.
- Active oracle availability.
- BTC chart readiness.
- Redeemable / lost position count.

It does not submit transactions, change protocol state, or replace the existing Account / Trade / Positions panels.

## Rationale

This improves demo reliability without changing the product's trading semantics:

- The user can see setup blockers before opening a position.
- The team can quickly verify whether the environment is ready for live mint / redeem.
- The panel makes indexer and oracle readiness more legible during a hackathon presentation.

## Consequences

- The right sidebar gains one additional operational panel.
- The panel uses existing hooks and cached queries where possible.
- The readiness result is a UI guide only; transaction-critical checks still happen through Sui RPC simulation and wallet transaction execution.

## Alternatives Considered

### Put readiness checks into a modal

Rejected. A modal would interrupt the trading flow. The checklist should stay visible and passive.

### Only document the checklist

Rejected. A written checklist is useful, but live state is more valuable during a demo.

## Revisit When

- The app adds a full onboarding flow.
- The product is deployed publicly and the demo-specific checklist should become a user onboarding checklist.
- Additional protocols or funding sources are added.
