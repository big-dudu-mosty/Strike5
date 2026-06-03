# 0017: SuiVision Transaction Links

Status: Accepted
Date: 2026-06-03

## Context

Strike5 now submits real Sui testnet transactions for:

```text
create PredictManager
deposit dUSDC
withdraw dUSDC
mint / mint_range
redeem / redeem_range
```

For the hackathon demo, each successful on-chain action should be easy to verify without asking judges to copy a digest manually.

## Decision

Show every successful transaction digest as a clickable SuiVision testnet link.

The frontend uses:

```text
https://testnet.suivision.xyz/txblock/{digest}
```

for transaction links.

The UI now renders transaction links for:

- PredictManager creation.
- Manual Manager deposit.
- Manual Manager withdrawal.
- Mint / mint_range submission.
- Redeem / redeem_range submission.

## Rationale

This improves demo credibility and debugging:

- Judges can verify that the flow is backed by real Sui transactions.
- Users can inspect transaction effects and events.
- Failed indexer refreshes can be debugged against the transaction digest.

## Consequences

- Strike5 has one external explorer dependency for transaction verification.
- Sui RPC remains the authoritative transaction submission and confirmation path; SuiVision is only a human-facing explorer link.
- If SuiVision changes routes or is unavailable, the link base should be updated or replaced with another explorer.

## Alternatives Considered

### Show raw digest only

Rejected. It is less useful in a live demo because users must copy and paste the digest into an explorer.

### Use Sui Explorer

Not selected for this iteration because the team has already been using SuiVision links during testing.

## Revisit When

- The app supports multiple Sui networks.
- A preferred official explorer route is required.
- The demo deploys to mainnet and the explorer base URL must change.
