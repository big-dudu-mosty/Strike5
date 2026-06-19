# Strike5 Video Runbook

Target length: 2-3 minutes.

Language: English.

Recording style: alternate between the slide deck and the live app. Use the slides to explain the product, then switch to the page to prove it works.

## Segment Plan

### 1. Opening Slide

Show slide 1.

Voiceover:

> Strike5 is a short-cycle BTC prediction arena powered by DeepBook Predict on Sui. Users open fixed-risk BTC positions, track live PnL, cash out before expiry, or hold to oracle settlement. Around that trading flow, Strike5 adds streaks, opt-in rankings, and verified social posts.

### 2. Market Gap

Show slide 2.

Voiceover:

> Most prediction products still feel like event boards: make a pick, wait for settlement, and leave. DeepBook Predict gives us a stronger primitive: vault-backed pricing, oracle-driven BTC rounds, and composable on-chain positions. Strike5 is the product layer that turns that primitive into a repeatable user loop.

### 3. Product Loop

Show slide 3, then switch to the live app.

Voiceover:

> The core loop is simple. Connect a Sui wallet, choose a BTC direction or range, review the Predict quote, sign the transaction, manage the position, and then flow into the arena layer.

Live app cue:

- Open the trading page.
- Point to wallet status, Oracle Spot, available liquidity, and active round.
- Show the BTC chart and right-side Arena panel.

### 4. Live Trading Flow

Stay on the live app.

Voiceover:

> Here the user chooses an outcome, enters a fixed stake, and sees the cost, maximum payout, current redeem value, and maximum loss before signing. The important part is that this is not a simulated prediction card. The position lifecycle maps back to DeepBook Predict.

Live app cue:

- Choose Above, Below, or Range.
- Enter a small stake.
- Show quote preview.
- If recording a real transaction, click the primary action and confirm the wallet manually.
- Show the position panel after the transaction lands.

### 5. Arena Layer

Switch to slide 5, then live Playbook and Community pages.

Voiceover:

> Once the trading path is real, the product layer can create retention. Streak combo rewards users who carry multiple correct calls. The leaderboard is opt-in by default. Feed posts can attach verified position snapshots, so social content is tied back to real trading state.

Live app cue:

- Open Playbook.
- Show the current or historical streak.
- Open Community.
- Show leaderboard privacy state and feed posting area.

### 6. Closing Slide

Show slide 6.

Voiceover:

> Strike5 converts DeepBook Predict infrastructure into a consumer trading loop: real liquidity, real settlement, and repeatable arena behavior. For users, it feels like fast fixed-risk BTC trading. For the protocol, it creates more wallet activity, more dUSDC usage, and more vault-facing trade flow.

## Recording Checklist

- Browser zoom: 90%-100%.
- Wallet on Sui testnet.
- Wallet connected to Strike5.
- Use a test wallet only.
- Keep dUSDC ready for a small trade.
- Avoid showing private keys, seed phrases, password managers, personal tabs, or notifications.
- Pick a BTC round with enough time remaining for the recording.
