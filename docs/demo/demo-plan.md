# Strike5 Demo Plan

本文档定义 Strike5 Arena 的黑客松演示路径、讲解口径、备用方案和评委关注点。

## 1. Demo 目标

Demo 要证明 Strike5 Arena 不是 mock prediction UI，而是一个真实接入 DeepBook Predict 的 BTC 短周期预测竞技场。

需要展示的闭环：

```text
BTC K-line / Oracle Spot
-> Current Round
-> Arena Challenge
-> DeepBook Predict quote
-> wallet signed PTB
-> mint / mint_range
-> position appears in PredictManager
-> settlement / redeem
-> leaderboard / showcase / sealed call flow
```

## 2. 核心讲法

推荐开场（核心钩子：settlement ≠ pace）：

```text
Settlement is slow, but markets are fast. We read the Predict contract and found that the vault is a continuous counterparty: positions can be sold back at the live vol-surface bid at any time before settlement. So we built Strike5 Arena — a fixed-risk BTC scalping arena where users open a position, watch live PnL tick, and cash out in seconds, all on-chain. On top of that, a streak parlay rewards those who dare to lock positions to settlement: win 3 consecutive rounds for 8x arena score, but cash out early and you forfeit the streak.
```

中文讲法：

```text
结算很慢，但市场很快。我们读了 Predict 合约，发现 vault 是连续报价的对手方：仓位在结算前随时可以按波动率曲面的 live bid 卖回。于是我们做了 Strike5 Arena——固定风险的 BTC 短线竞技场：开仓、看实时 PnL 跳动、几秒内 Cash Out，全程链上。再往上是连胜串关：敢把仓位锁到结算的人，连赢 3 轮拿 8x Arena 分数；提前落袋就弃权。随时可以跑，但跑了连胜就没了。
```

## 3. 必须强调的事实

### 3.1 仍然基于 DeepBook Predict

正确说法：

```text
Strike5 Arena is a product layer on top of DeepBook Predict. Pricing, minting, position accounting, vault liquidity, and settlement are handled by DeepBook Predict.
```

中文：

```text
Strike5 Arena 是 DeepBook Predict 的产品层。报价、mint、仓位记录、vault 流动性和 settlement 都由 DeepBook Predict 完成。
```

### 3.2 不是任意事件市场

正确说法：

```text
The current MVP uses DeepBook Predict's live BTC oracle. ETH, SUI, SOL, sports, and political events are future expansions only when valid oracles and settlement paths exist.
```

中文：

```text
当前 MVP 使用 DeepBook Predict 已有的 BTC oracle。ETH / SUI / SOL、体育、政治或新闻事件，只有在存在官方 oracle 和结算路径后才会扩展。
```

### 3.3 节奏来自连续交易，不伪造更短结算

正确说法：

```text
Pace comes from continuous trading: positions can be cashed out at the live bid anytime before settlement. Settlement itself always uses DeepBook Predict's real oracle expiry. Strike5 never fakes a shorter on-chain settlement.
```

中文：

```text
节奏来自连续交易：仓位在结算前随时可按 live bid 平仓（Cash Out）。结算本身始终使用 DeepBook Predict 真实的 oracle expiry，Strike5 不伪造更短链上结算。
```

### 3.4 Chart Price 和 Oracle Spot 不一样

正确说法：

```text
Chart price is for visual market reference. DeepBook Predict oracle spot and settlement price are used for quote and settlement.
```

中文：

```text
K 线价格用于辅助判断，报价和结算以 DeepBook Predict OracleSVI 为准。
```

### 3.5 排行榜是 opt-in

正确说法：

```text
On-chain transactions are public, but Strike5 only aggregates and displays leaderboard stats for users who explicitly opt in.
```

中文：

```text
链上交易本身公开，但 Strike5 只聚合和展示主动 opt-in 用户的排行榜数据。
```

### 3.6 Sealed Calls 的隐私边界

正确说法：

```text
Sealed Calls hide the social prediction content before reveal. They do not hide the underlying DeepBook Predict mint or redeem transaction.
```

中文：

```text
Sealed Calls 隐藏的是赛前发表的观点内容，不隐藏底层 DeepBook Predict mint / redeem 链上交易。
```

### 3.7 Combo 不是真钱乘法赔付

正确说法：

```text
Predict payouts settle normally. Combo multiplies Arena score and reputation, not the underlying on-chain payout. Streak legs must be held to settlement; cashing out early forfeits the streak (a neutral surrender, not a loss).
```

中文：

```text
DeepBook Predict 的真实 payout 仍按原生仓位结算。Combo 乘倍的是 Arena 积分和声誉，不是底层链上赔付。串关 leg 必须持有到结算；提前 Cash Out 即弃权（中性状态，不算败）。
```

## 4. Demo 顺序

### Step 1: 打开首页

展示：

- BTC K-line。
- Oracle Spot。
- Chart Price。
- Current Round / Current Expiry。
- Countdown。
- Arena Challenge Cards。
- Positions。
- Leaderboard / Feed 入口。

讲解：

```text
This is a prediction arena built on DeepBook Predict. Each BTC oracle expiry becomes a round, and every challenge maps to a real DeepBook Predict position or range.
```

### Step 2: 解释 Round 和 Expiry

展示 countdown 和当前 round。

讲解：

```text
The product presents each active BTC expiry as an Arena round. We do not create off-chain markets or fake settlement; settlement comes from DeepBook Predict's OracleSVI.
```

### Step 3: 连接钱包

展示：

- Wallet connected。
- Network is Sui testnet。
- dUSDC balance。
- PredictManager status。

如果没有 PredictManager：

```text
Create PredictManager
```

如果已有：

```text
Load existing PredictManager
```

### Step 4: 展示 Arena Challenges

展示系统生成挑战：

- BTC closes above current spot。
- BTC closes below current spot。
- BTC stays inside range。
- BTC breaks above selected strike。

讲解：

```text
These challenges are generated from the active oracle, expiry, and strike grid. They are not fake off-chain markets.
```

### Step 5: Quote Preview

确认页展示：

- challenge。
- trade type。
- strike / range。
- expiry。
- dUSDC cost。
- estimated payout。
- max loss。
- oracle freshness。
- chart/oracle diff。

讲解：

```text
The quote is simulated through DeepBook Predict before signing. The user sees cost, max loss, and estimated payout before submitting the PTB.
```

### Step 6: Mint

点击 Join / Predict。

展示：

- wallet signature request。
- tx submitted。
- tx digest。
- minted event。
- position appears in portfolio。

讲解：

```text
The frontend builds the PTB, the wallet signs it, and Sui RPC submits it. The Predict shared object executes mint or mint_range.
```

### Step 7: Position Panel + Live PnL

展示刚创建的仓位。

字段：

- round / expiry。
- trade type。
- strike / range。
- quantity。
- cost。
- status。
- 实时浮动 PnL（随 oracle tick 跳动）。
- Cash Out / redeem state。

讲解：

```text
The position quantity is recorded in PredictManager rather than as a standalone wallet object. The floating PnL you see ticking is quoted live against the vault's vol-surface bid.
```

### Step 7b: Cash Out（核心演示）

等实时 PnL 跳动几秒后，直接点 Cash Out。

展示：

- 当前 live 退出价。
- wallet signature request。
- tx digest。
- payout 回到 PredictManager，余额变化。

讲解：

```text
This is the part most people miss about DeepBook Predict: the vault is a continuous counterparty. We do not wait for settlement — the position is sold back at the live bid, on-chain, in one transaction. Open, watch, exit: the whole loop takes seconds.
```

这是整场 demo 的高光段落：30 秒内完成 开仓 -> PnL 跳动 -> Cash Out 落袋 的完整链上闭环。

### Step 8: Leaderboard Opt-in

展示：

- Join Leaderboard。
- Top 10 rule。
- minimum completed rounds。
- win rate ranking。
- hide profile。

讲解：

```text
The leaderboard is opt-in. Strike5 does not display or rank users who do not explicitly allow their stats to be shown.
```

### Step 9: Social Feed / Showcase

展示：

- public call。
- verified showcase。
- tx digest。
- settlement result。

讲解：

```text
The feed is not a normal comment section. Posts can be linked to a round, a market key, a transaction, and settlement result.
```

### Step 10: Sealed Calls

展示产品状态：

- create sealed call。
- locked before expiry。
- reveal after settlement。

讲解：

```text
Sealed Calls use Sui Seal's privacy model for encrypted prediction content and selective reveal. The idea is to prove a call was made before settlement without exposing it to copy-trading before expiry.
```

如果 Seal 集成尚未完成，明确说：

```text
The MVP shows the product flow and privacy boundary. Full Seal SDK integration is the next implementation step.
```

### Step 11: Combo

展示：

- 3-round combo plan。
- each leg maps to a real Predict position。
- all correct multiplies Arena score。

讲解：

```text
Each leg settles through DeepBook Predict normally. Combo is an Arena scoring layer for retention and competition, not a new payout model in this MVP.
```

### Step 12: Redeem

如果现场等待时间允许：

- 等到 oracle settlement 后 redeem。

如果现场时间不允许：

- 准备一个已 settled 的 position。
- 切换到 redeemable state。
- 演示 redeem / redeem_range。

讲解：

```text
After OracleSVI settlement, the user can redeem payout back into PredictManager.
```

## 4.5 五分钟 Demo 视频脚本（官方评审结构）

官方推荐结构：problem -> solution -> live demo -> why Sui -> roadmap。Real-World Application 占评分 50%，live demo 质量是核心。

### 0:00 - 0:45 Problem

```text
Prediction markets and on-chain options share one problem: you bet, then you wait.
Settlement windows are minutes to days, but traders live second to second.
Slow feedback kills retention — and that is a UX problem, not an infrastructure problem.
```

配画面：Polymarket 式"等待开奖"界面 vs 行情秒级跳动的对比。

### 0:45 - 1:30 Solution

```text
DeepBook Predict's vault is a continuous counterparty with vol-surface pricing.
We read the contract and productized what the docs don't emphasize:
positions can be sold back at the live bid at any time before settlement.

Strike5 Arena is a fixed-risk BTC scalping arena:
open a position, watch live PnL tick, cash out in seconds — all on-chain.
On top: a streak parlay that rewards commitment. Hold legs to settlement,
win 3 consecutive rounds for 8x arena score. Cash out early? You forfeit the streak.
```

### 1:30 - 3:30 Live Demo（核心，全程真机）

按以下节拍演：

1. 首页：K 线 + Oracle Spot + 结算轮次卡（约 15s）。
2. 选 Above 挑战，输入金额，展示链上模拟报价：cost / max payout / max loss（约 20s）。
3. 签名 mint，展示 SuiVision tx 链接，持仓卡出现（约 25s）。
4. 镜头停在实时 PnL 跳动几秒，旁白解释这是 vault 的 vol-surface live bid（约 15s）。
5. 点 Cash Out，签名，payout 回 Manager，余额变化 + tx 链接（约 25s）。
6. 切到 Playbook：展示连胜串关进度条 2x/4x/8x，演示串关 leg 的弃权警告弹窗（约 20s）。
7. 快速掠过 Leaderboard opt-in / Arena Feed / Sealed Calls（约 20s）。

关键台词：

```text
Notice we never waited for settlement. Open, watch, exit — the whole loop took 30 seconds,
and every step was a real DeepBook Predict transaction you can verify on SuiVision.
```

### 3:30 - 4:15 Why Sui

```text
This product cannot exist elsewhere.
- DeepBook Predict gives day-one vault liquidity and Block Scholes vol-surface pricing.
- One PTB atomically deposits collateral and mints the position — no approval dance.
- PredictManager's object model keeps balances and positions in one shared account.
- Sub-second checkpoints make the live PnL tape actually live.
```

### 4:15 - 5:00 Roadmap + 商业闭环

```text
Every mint and cash-out pays spread into the Predict vault — our pace mechanics
are a volume engine for PLP. Roadmap: app-layer fee in the same PTB, zkLogin +
sponsored transactions for walletless onboarding, Seal-backed sealed calls,
Nautilus-verified scoring, and a real-money parlay vault after mainnet.
All contract IDs live in one config file — we migrate the day Predict hits mainnet.
```

## 5. 推荐演示脚本

完整讲稿：

```text
Strike5 Arena is a privacy-aware BTC prediction arena built on DeepBook Predict.

Instead of listing arbitrary off-chain events, we use DeepBook Predict's live BTC oracle, strike grid, vol-surface pricing, and vault liquidity.

Each active BTC expiry becomes an Arena round. Users can join challenges such as BTC above spot, below spot, or inside a range. Every challenge maps to a real DeepBook Predict market key or range key.

The chart price is only a visual reference. Quote and settlement use DeepBook Predict's OracleSVI.

Before signing, the app simulates the quote and shows dUSDC cost, estimated payout, max loss, expiry, and oracle freshness.

When the user confirms, the frontend builds a PTB, the wallet signs it, and the transaction calls DeepBook Predict's Predict shared object. The position quantity is recorded inside PredictManager.

To make the product less like a one-off trading terminal, Strike5 adds opt-in leaderboards, verified showcases, Sealed Calls, and Combo scoring.

The leaderboard is privacy-aware: on-chain transactions are public, but Strike5 only aggregates and displays stats for users who opt in.

Sealed Calls are designed for pre-settlement social predictions. Users can encrypt a call before expiry and reveal it after settlement, proving they made the call early without exposing it before the round closes.

Combo keeps the underlying Predict payouts unchanged while multiplying Arena score for users who correctly predict multiple rounds.

After settlement, the user redeems through DeepBook Predict and receives payout into PredictManager.
```

## 6. 评委可能会问的问题

### Q1: 你们是不是自己做了一个预测市场？

答：

```text
不是。Strike5 Arena 是 DeepBook Predict 的产品层。报价、mint、仓位记录、vault exposure 和 settlement 都由 DeepBook Predict 完成。
```

### Q2: 为什么还是 BTC？

答：

```text
因为当前可真实测试的是 DeepBook Predict 的 BTC oracle。我们不伪造 ETH / SUI / SOL 或任意事件市场。产品丰富度来自 Arena、leaderboard、verified feed、sealed calls 和 combo，而不是假装存在更多 oracle。
```

### Q3: 排行榜是不是侵犯隐私？

答：

```text
链上交易本来公开，但 Strike5 默认不聚合、不展示用户战绩。用户只有主动 opt-in 才进入 Top 10 排行榜，也可以隐藏 profile。
```

### Q4: Sealed Calls 具体保护什么？

答：

```text
保护的是用户赛前发表的观点内容。它可以防止观点在到期前被抄单，并在到期后 reveal 证明预测不是事后发布。它不隐藏底层 mint / redeem 链上交易。
```

### Q5: Combo 是不是新的投注平台？

答：

```text
MVP 不是真钱串关。每个 leg 都是普通 DeepBook Predict 仓位，原生 payout 正常结算。Combo 只乘倍 Arena score 和声誉。真钱 Parlay Vault 是后续主网扩展。
```

### Q6: K 线价格和 oracle 价格不一致怎么办？

答：

```text
K 线价格是外部行情参考。Strike5 会同时展示 Chart Price 和 Oracle Spot，并展示偏差。最终 quote 和 settlement 以 DeepBook Predict OracleSVI 为准。
```

### Q7: 用户仓位在哪里？

答：

```text
仓位不是独立 NFT 或独立 position object。DeepBook Predict 的 binary positions 和 ranges 是记录在用户 PredictManager 内部的 quantity。
```

### Q8: 现在 testnet 只有日档 oracle，你们的快节奏从哪来？

答：

```text
节奏不依赖结算频率。我们读合约发现 redeem 有未结算分支：仓位随时可按 live bid 卖回 vault。所以节奏来自连续交易（开仓 -> 实时 PnL -> Cash Out），oracle expiry 只作为串关和开奖的结算锚点。日档 oracle 反而是全天开放的赛场；短档恢复时体验自动更好，但不是依赖。
```

### Q9: 这个项目对 DeepBook 有什么价值？

答：

```text
Strike5 Arena 给 DeepBook Predict 带来一个 consumer-facing prediction arena，会增加 dUSDC 使用、PredictManager 创建、mint / redeem 交易量和 Predict Vault / PLP 流动性需求。排行榜、晒单和 Combo 提高复玩率，有利于把 Predict 从协议能力变成用户增长产品。每次 Cash Out 都付一次 spread 给 vault——快节奏玩法本身就是 PLP 的收入放大器。
```

### Q10: 和官方将要发布的 first-party app 有什么区别？

答：

```text
官方 first-party app 是交易终端形态，服务已经会交易的人。Strike5 是 consumer arena：
固定风险、无爆仓、连胜串关、弃权张力、社交晒单——把不懂期权的预测玩家变成交易者。
终端是工具，竞技场是分发层。我们给协议带来的是它自己触达不到的用户群，不是替代官方入口。
```

### Q11: 奖励主网部署，但你们在 testnet，怎么办？

答：

```text
DeepBook Predict 协议本身还在 testnet（官方口径 mainnet later this year）。
我们是 mainnet-ready, protocol-gated：所有 package / object id 集中在一个 config 文件，
官方主网部署当天我们换一份配置即可迁移。这是协议时间表的约束，不是我们的架构债。
```

### Q12: 排行榜和连胜分数在 localStorage，这算 production-ready 吗？

答：

```text
分两层看。资金层 100% 链上：每条串关 leg 都锚定真实 PredictManager 仓位和 tx digest，
任何人可验证；分数聚合层是 MVP 取舍，文档里从未声称上链。
roadmap 是后端聚合 + Nautilus 可信计分。我们宁可如实标注，也不伪装链上统计。
```

## 7. 备用方案

如果现场 oracle 等待时间太长：

- 使用已有 settled position 演示 redeem。
- 同时展示当前 active oracle 上的 mint。

如果 Predict Server 延迟：

- 用 Sui RPC 读取关键对象。
- UI 显示 indexed data pending。

如果 wallet 交易失败：

- 展示 quote simulation。
- 展示 PTB 构造参数。
- 展示之前成功交易的 tx digest。

如果 dUSDC 不足：

- 准备 faucet / 预置钱包。
- 准备一个已有 PredictManager 和余额的钱包。

如果 Leaderboard / Feed 后端未完成：

- 展示 opt-in 规则和本地 mock 数据必须标注为 demo data。
- 不把 mock 统计说成已从链上计算。

如果 Seal 集成未完成：

- 展示 Sealed Calls 的产品流程和 privacy boundary。
- 不声称已经完成真实加密 / reveal。

## 8. Demo Checklist

演示前确认：

- Sui wallet 已配置 testnet。
- 钱包有 gas。
- 钱包有 dUSDC。
- 已创建或能创建 PredictManager。
- active BTC oracle 存在。
- Predict Server 可访问。
- K-line provider 可访问。
- 至少准备一个可 mint 的 challenge。
- 最好准备一个 redeemable position。
- Leaderboard opt-in 状态可展示。
- Feed 至少有一条 verified showcase 或 call demo。
- Sealed Calls 状态清楚标注已完成 / demo-only。
- Combo 状态清楚标注积分乘倍，不是真钱乘法赔付。

## 9. 成功标准

Demo 成功的最低标准：

```text
展示 K 线
展示 active oracle
展示 challenge quote
签名 mint
展示 position 和实时 PnL 跳动
现场 Cash Out 落袋（30 秒闭环）
展示结算 redeem 路径
展示 opt-in leaderboard / feed / 连胜串关玩法
```

最佳状态：

```text
现场完成 mint -> 实时 PnL -> Cash Out 的秒级闭环，并能在 tx effects / events 中看到 DeepBook Predict 真实交易结果；展示一条进行中的连胜串关（含弃权警告）、一个 opt-in leaderboard entry、一个 verified showcase 和一个 sealed call reveal flow。
```
