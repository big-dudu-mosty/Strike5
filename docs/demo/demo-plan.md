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

推荐开场：

```text
Most prediction markets stop at isolated bets. Strike5 Arena turns DeepBook Predict's BTC oracle markets into a social prediction arena: users join short-cycle rounds, make fixed-risk on-chain predictions, publish sealed calls, compete on opt-in leaderboards, and redeem after settlement.
```

中文讲法：

```text
传统预测市场通常只是孤立下注。Strike5 Arena 把 DeepBook Predict 的 BTC oracle markets 包装成一个短周期预测竞技场：用户每轮参与 BTC Above / Below / Range 挑战，用真实 dUSDC 开仓，到期链上结算，并通过 opt-in 排行榜、晒单和 Sealed Calls 形成社交声誉。
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

### 3.3 不是 5 分钟链上结算

正确说法：

```text
Strike5 uses short product rounds with DeepBook Predict's current BTC oracle expiry. It does not fake a shorter on-chain settlement.
```

中文：

```text
Strike5 是短周期产品竞技节奏，实际结算使用当前 DeepBook Predict testnet 的 BTC oracle expiry，不伪造更短链上结算。
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
Predict payouts settle normally. Combo multiplies Arena score and reputation, not the underlying on-chain payout.
```

中文：

```text
DeepBook Predict 的真实 payout 仍按原生仓位结算。Combo 乘倍的是 Arena 积分和声誉，不是底层链上赔付。
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

### Step 7: Position Panel

展示刚创建的仓位。

字段：

- round / expiry。
- trade type。
- strike / range。
- quantity。
- cost。
- status。
- redeem state。

讲解：

```text
The position quantity is recorded in PredictManager rather than as a standalone wallet object.
```

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

### Q8: 这个项目对 DeepBook 有什么价值？

答：

```text
Strike5 Arena 给 DeepBook Predict 带来一个 consumer-facing prediction arena，会增加 dUSDC 使用、PredictManager 创建、mint / redeem 交易量和 Predict Vault / PLP 流动性需求。排行榜、晒单和 Combo 提高复玩率，有利于把 Predict 从协议能力变成用户增长产品。
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
展示 current round
展示 challenge quote
签名 mint
展示 position
展示 redeem 路径
展示 opt-in leaderboard / feed 玩法
```

最佳状态：

```text
现场完成 mint + redeem，并能在 tx effects / events 中看到 DeepBook Predict 真实交易结果；同时展示一个 opt-in leaderboard entry、一个 verified showcase 和一个 sealed call reveal flow。
```
