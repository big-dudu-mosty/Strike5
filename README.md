# Strike5

Strike5 is a short-cycle BTC prediction arena built on **DeepBook Predict** on Sui testnet.

It turns DeepBook Predict's live BTC oracle markets into a consumer trading game: users open fixed-risk Above, Below, or Range positions with dUSDC, watch live PnL, cash out before expiry, or hold to settlement for verified results, streaks, leaderboard stats, and social posts.

> Built for the DeepBook Predict hackathon track. The product integrates the real DeepBook Predict testnet contract, PredictManager account model, dUSDC quote asset, oracle settlement, mint/redeem flows, and Predict Server indexed data.

## Product Idea

Prediction markets are usually either event-listing apps or sportsbook-like products. DeepBook Predict is different: it exposes programmable strike and range markets priced from a volatility surface, with a vault acting as continuous counterparty liquidity.

Strike5 makes that protocol legible to users through a simple loop:

```text
Pick a BTC round
-> choose Above / Below / Range
-> get a live DeepBook Predict quote
-> mint a real position into PredictManager
-> track live PnL
-> cash out early or hold to oracle settlement
-> redeem, publish, and update leaderboard / streak stats
```

The goal is not to create fake ETH/SOL/news markets. The MVP stays anchored to the BTC oracle markets that DeepBook Predict currently exposes on testnet.

## Why It Fits DeepBook Predict

Strike5 uses DeepBook Predict as the core market layer, not just as a branding add-on.

| Strike5 feature | DeepBook Predict primitive |
|---|---|
| BTC Arena rounds | Active BTC OracleSVI expiries |
| Above / Below challenge | `predict::mint` directional binary position |
| Stay In Range challenge | `predict::mint_range` range position |
| Fixed-risk stake | dUSDC quote asset and max payout quote |
| PredictManager account | User balances and position quantities |
| Live cash out | `redeem` / `redeem_range` before settlement at live bid |
| Final result | Oracle settlement price |
| Leaderboard and feed | Predict Server mint/redeem/range events plus oracle state |

This creates a real protocol usage loop: each user action routes through DeepBook Predict quote, mint, redeem, and settlement state.

## Core Features

### Trading Arena

- BTC/USD K-line chart with red/green candles.
- DeepBook Predict Oracle Spot and oracle freshness.
- Active round countdown.
- Quick-pick challenge cards:
  - Above Spot
  - Below Spot
  - Stay In Range
- Custom strike and custom range builder.
- Quote preview for cost, max payout, live redeem value, and max loss.
- Sui wallet transaction flow for opening positions.

### PredictManager Account Flow

- Wallet connection through Sui dApp Kit.
- Sui testnet network detection.
- dUSDC wallet balance display.
- PredictManager discovery and account state.
- Manager balance, account value, and open position count.
- Auto top-up into PredictManager when opening a position requires more manager balance.

### Real Position Lifecycle

- Mint real directional or range positions.
- Read indexed Predict position data.
- Fallback to raw mint/redeem events when summary data lags.
- Display active, awaiting settlement, redeemable, lost, and redeemed states.
- Cash out before settlement when the protocol allows live redeem.
- Redeem settled positions after oracle settlement.
- Link successful transactions to SuiVision testnet.

### Streak Combo

The combo feature is a product layer on top of real Predict positions.

- A user can build a 3-leg streak across later rounds.
- Each leg must correspond to a real opened position.
- Winning legs increase the arena score multiplier:
  - 1 win = 2x
  - 2 wins = 4x
  - 3 wins = 8x
- Cashing out a streak leg before settlement forfeits the streak.
- Completed, busted, surrendered, and pending streaks are resolved from real position and oracle state.

This is not a fake multiplied payout at the protocol level. It is an arena scoring mechanic tied to real settlement outcomes.

### Opt-In Leaderboard

- Users are hidden by default.
- A user must opt in before their Arena stats are shown.
- Stats are computed from real Predict data:
  - mint events
  - redeem events
  - position summaries
  - range events
  - oracle settlement prices
- The leaderboard shows:
  - win rate
  - completed rounds
  - current streak
  - total PnL
- If summary endpoints lag, the app falls back to raw indexed events and direct oracle state.

### Arena Feed

- Users can publish market views.
- Posts can attach a verified position.
- The attached position is not a stale screenshot only. It is matched back to current indexed position data so settlement status and PnL can update after the round ends.
- Posts expose wallet alias and PredictManager only when the user publishes.

### Sealed Calls

- Users can commit to a private call before expiry.
- The MVP uses local SHA-256 commitment logic.
- The call content stays hidden before expiry and can be revealed later.
- This is designed as a future path toward Sui Seal based encrypted calls.

## Architecture

```text
React frontend
  -> DeepBook Predict Server API
  -> Sui testnet RPC
  -> Sui wallet
  -> DeepBook Predict shared object
  -> PredictManager
  -> OracleSVI settlement
```

Important distinction:

```text
Predict Server summary data is useful, but it is not treated as the only source of truth.
For settlement-sensitive features, Strike5 also reads raw mint/redeem events and oracle state.
```

This matters because newly settled positions may appear in raw events or oracle state before every summary endpoint has caught up.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS |
| Wallet | `@mysten/dapp-kit-react` |
| Sui SDK | `@mysten/sui` |
| Data fetching | TanStack Query |
| Charting | Lightweight Charts |
| Icons | Lucide React |
| Protocol | DeepBook Predict on Sui testnet |

## DeepBook Predict Testnet Config

Current app config is in `src/config/predict.ts`.

| Item | Value |
|---|---|
| Network | Sui testnet |
| Sui RPC | `https://fullnode.testnet.sui.io:443` |
| Predict Server | `https://predict-server.testnet.mystenlabs.com` |
| Predict package | `0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138` |
| Predict object | `0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a` |
| Quote asset | dUSDC testnet asset |

`dUSDC` here is the DeepBook Predict testnet quote asset. It is not the official USDC token.

## Getting Started

Install dependencies:

```bash
pnpm install
```

Start the local development server:

```bash
pnpm dev
```

Build for production:

```bash
pnpm build
```

Run type checking:

```bash
pnpm typecheck
```

Run lint:

```bash
pnpm lint
```

## Demo Flow

1. Open the app.
2. Connect a Sui wallet.
3. Switch to Sui testnet.
4. Make sure the wallet has testnet dUSDC.
5. Create or load a PredictManager.
6. Choose an active BTC round.
7. Enter stake size.
8. Select Above, Below, or Stay In Range.
9. Review quote and max loss.
10. Open the position through wallet signing.
11. Watch the position appear in the Positions panel.
12. Either cash out before expiry or hold to settlement.
13. After oracle settlement, redeem the settled position.
14. Check Community:
    - leaderboard completed rounds
    - win rate
    - PnL
    - verified feed position status
15. Check Playbook:
    - streak leg status
    - completed / busted / surrendered history

## Project Structure

```text
src/
  app/                  Main app shell and page routing
  components/
    account/            Wallet, dUSDC, PredictManager state
    arena-overview/     Market status bar and top-level stats
    chart/              BTC chart and strike overlays
    combo/              Streak combo and history
    leaderboard/        Opt-in community ranking
    positions/          Position display, cash out, redeem
    sealed-calls/       Local commitment based sealed calls
    social-feed/        Verified Arena posts
    trade-panel/        Quote, mint, combo entry controls
  config/               Predict package IDs and product constants
  hooks/                Query and transaction hooks
  lib/
    deepbook/           Quote and PTB construction
    market-data/        BTC K-line provider
    predict-server/     Predict Server API client and types
    i18n/               English and Chinese copy
docs/
  product/              Product specification
  technical/            Architecture and integration notes
  demo/                 Demo plan
  decisions/            Decision records
  planning/             Engineering roadmap
```

## Key Documents

- `docs/product/product-spec.md`
- `docs/technical/architecture.md`
- `docs/technical/deepbook-integration.md`
- `docs/demo/demo-plan.md`
- `docs/planning/implementation-roadmap.md`
- `docs/decisions/README.md`

## What Is Real In The MVP

Real:

- Sui wallet connection.
- Sui testnet transaction signing.
- dUSDC balance and PredictManager flow.
- DeepBook Predict quote path.
- `mint` / `mint_range` transaction construction.
- settled and unsettled redeem path.
- Predict Server position, range, manager, vault, and oracle reads.
- leaderboard and feed data derived from real indexed Predict events.

Product-layer MVP:

- Streak combo scoring.
- Opt-in leaderboard visibility.
- Arena feed posts.
- Local sealed-call commitments.

Not included:

- Mainnet Predict deployment.
- Non-BTC official Predict markets.
- Fake sports, politics, or news event markets.
- Real multiplied payout for combo streaks.
- Cross-chain asset routing.
- DeepBook Margin or Iron Bank loops.
- Production Sui Seal integration.

## Current Limitations

- DeepBook Predict is testnet-only in this demo.
- dUSDC is a testnet quote asset.
- BTC is the primary supported underlying because it is the active Predict oracle market.
- Sealed Calls use local commitment proof in the MVP.
- Leaderboard is opt-in and local-user scoped for the demo surface, while stats are computed from real Predict indexed data.
- If the Predict indexer is delayed, the UI may temporarily show partial data, then reconcile from raw events and oracle state.

## Roadmap

Near-term improvements:

- Sui Seal backed encrypted call storage.
- Better leaderboard persistence across users.
- Public share pages for verified calls.
- More detailed PnL attribution.
- PLP risk and vault analytics.
- Multi-oracle support when official Predict markets are available.
- Keeper-assisted settlement reminders and redeem flows.

## References

- DeepBook Predict docs: `https://docs.sui.io/onchain-finance/deepbook-predict/`
- Predict Server API: `https://predict-server.testnet.mystenlabs.com`
- Sui testnet explorer: `https://testnet.suivision.xyz`
- Local protocol reference: `../deepbookv3-predict`

