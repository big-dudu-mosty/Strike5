# Strike5 Demo Plan

本文档定义黑客松演示路径、讲解口径、备用方案和评委关注点。

## 1. Demo 目标

Demo 要证明 Strike5 不是一个 mock prediction UI，而是一个真实接入 DeepBook Predict 的 BTC 短周期交易终端。

需要展示的闭环：

```text
BTC K-line
-> DeepBook Predict active oracle
-> Above / Below / Range quote
-> wallet signed PTB
-> mint / mint_range
-> position appears
-> settlement / redeem
-> vault health
```

## 2. 核心讲法

推荐开场：

```text
Most prediction markets depend on hand-listed events. Strike5 uses DeepBook Predict's oracle, strike grid, volatility-surface pricing, and vault liquidity to turn BTC short-cycle price movement into programmable fixed-risk markets.
```

中文讲法：

```text
传统预测市场通常要平台手动列事件，比如选举、体育或新闻。Strike5 不做事件列表，而是直接使用 DeepBook Predict 的 oracle、strike grid、vol-surface pricing 和 vault liquidity，让用户从 BTC K 线出发，交易短周期方向和价格区间。
```

## 3. 必须强调的事实

### 3.1 不是 5 分钟链上结算

正确说法：

```text
Strike5 uses 5-minute product rounds with DeepBook Predict's current 15-minute oracle settlement.
```

中文：

```text
Strike5 是 5 分钟产品交易节奏，实际结算使用当前 DeepBook Predict testnet 的 15 分钟 oracle expiry。
```

不要说：

```text
DeepBook Predict supports native 5-minute settlement.
```

### 3.2 Chart Price 和 Oracle Spot 不一样

正确说法：

```text
Chart price is for visual market reference. DeepBook Predict oracle spot and settlement price are used for quote and settlement.
```

中文：

```text
K 线价格用于辅助判断，报价和结算以 DeepBook Predict OracleSVI 为准。
```

### 3.3 Position 存在 PredictManager 内部

正确说法：

```text
Positions are not separate wallet objects. Binary and range quantities are stored inside PredictManager.
```

中文：

```text
用户仓位不是独立钱包对象，而是记录在 PredictManager 内部。
```

## 4. Demo 顺序

### Step 1: 打开首页

展示：

- BTC K-line。
- Oracle Spot。
- Chart Price。
- Current Expiry。
- Countdown。
- Vault & Oracle Health。

讲解：

```text
This is a chart-first trading terminal for DeepBook Predict. Users make short-cycle BTC decisions from the chart, but settlement is handled by DeepBook Predict.
```

### Step 2: 解释 5m / 15m 关系

展示 countdown 和当前 round。

讲解：

```text
The UI refreshes trade opportunities every 5 minutes. The actual onchain settlement targets the nearest 15-minute DeepBook Predict oracle expiry.
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

### Step 4: 展示 Quick Picks

展示系统生成卡片：

- Above spot。
- Below spot。
- Range near spot。
- Wider range。

讲解：

```text
These cards are generated from the active oracle, expiry, and strike grid. They are not fake offchain markets.
```

### Step 5: 展示 Custom Builder

输入一个自定义 strike 或 range。

展示：

- 输入价格。
- snapped strike。
- quote preview。

讲解：

```text
User inputs are snapped to DeepBook Predict's valid strike grid before transaction construction.
```

### Step 6: Quote Preview

确认页展示：

- trade type
- strike / range
- expiry
- dUSDC cost
- estimated payout
- max loss
- oracle freshness
- chart/oracle diff

讲解：

```text
The user sees the cost and max loss before signing. Quote is confirmed before the PTB is submitted.
```

### Step 7: Mint

点击交易按钮。

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

### Step 8: Position Panel

展示刚创建的仓位。

字段：

- trade type
- strike / range
- expiry
- quantity
- cost
- status
- redeem state

讲解：

```text
The position quantity is recorded in PredictManager rather than as a standalone wallet object.
```

### Step 9: Vault & Oracle Health

展示：

- vault balance
- vault value
- available liquidity
- utilization
- total max payout
- PLP share price
- oracle freshness

讲解：

```text
Predict Vault / PLP is the counterparty and liquidity source for these trades. This is why the product is directly useful to DeepBook Predict.
```

### Step 10: Redeem

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
Strike5 is a BTC short-cycle fixed-risk trading terminal built on DeepBook Predict.

Instead of asking users to bet on manually listed events, we let users trade BTC direction and ranges directly from a chart.

The chart price is only a visual reference. The actual quote and settlement use DeepBook Predict's OracleSVI.

On the current testnet, the shortest active oracle expiry is 15 minutes, so Strike5 creates a 5-minute trading rhythm at the product layer while settling against the nearest 15-minute DeepBook Predict oracle.

Here are Quick Picks generated from the live oracle spot and strike grid. Users can also build a custom Above, Below, or Range position.

Before signing, we show the dUSDC cost, estimated payout, max loss, expiry, and oracle freshness.

When the user confirms, the frontend builds a PTB, the wallet signs it, and the transaction calls DeepBook Predict's Predict shared object. The position quantity is recorded inside PredictManager.

The counterparty and liquidity are handled by Predict Vault / PLP, which we expose in this health panel.

After settlement, the user redeems through DeepBook Predict and receives payout into PredictManager.
```

## 6. 评委可能会问的问题

### Q1: 你们是不是自己做了一个预测市场？

答：

```text
不是。Strike5 是 DeepBook Predict 的前端产品层。报价、mint、仓位记录、vault exposure 和 settlement 都由 DeepBook Predict 完成。
```

### Q2: 为什么是 5 分钟？

答：

```text
5 分钟是用户交易节奏，不是链上 settlement。当前 testnet 最短 active expiry 是 15 分钟，所以我们把 15 分钟拆成三个 5 分钟交易窗口，最终统一到最近的 15 分钟 oracle settlement。
```

### Q3: K 线价格和 oracle 价格不一致怎么办？

答：

```text
K 线价格是外部行情参考。Strike5 会同时展示 Chart Price 和 Oracle Spot，并展示偏差。最终 quote 和 settlement 以 DeepBook Predict OracleSVI 为准。
```

### Q4: 用户仓位在哪里？

答：

```text
仓位不是独立 NFT 或独立 position object。DeepBook Predict 的 binary positions 和 ranges 是记录在用户 PredictManager 内部的 quantity。
```

### Q5: 这个项目对 DeepBook 有什么价值？

答：

```text
Strike5 给 DeepBook Predict 带来一个 consumer-facing trading terminal，会增加 dUSDC 使用、PredictManager 创建、mint / redeem 交易量和 Predict Vault / PLP 流动性需求。
```

## 7. 备用方案

如果现场 oracle 等待时间太长：

- 使用已有 settled position 演示 redeem。
- 同时展示当前 active oracle 上的 mint。

如果 Predict Server 延迟：

- 用 Sui RPC 读取关键对象。
- UI 显示 indexed data pending。

如果 wallet 交易失败：

- 展示 devInspect quote。
- 展示 PTB 构造参数。
- 展示之前成功交易的 tx digest。

如果 dUSDC 不足：

- 准备 faucet / 预置钱包。
- 准备一个已有 PredictManager 和余额的钱包。

## 8. Demo Checklist

演示前确认：

- Sui wallet 已配置 testnet。
- 钱包有 gas。
- 钱包有 dUSDC。
- 已创建或能创建 PredictManager。
- active oracle 存在。
- Predict Server 可访问。
- K-line provider 可访问。
- 至少准备一个可 mint 的 trade。
- 最好准备一个 redeemable position。
- Vault summary 能正常显示。

## 9. 成功标准

Demo 成功的最低标准：

```text
展示 K 线
展示 active oracle
展示 quote
签名 mint
展示 position
展示 vault health
展示 redeem 路径
```

最佳状态：

```text
现场完成 mint + redeem，并能在 tx effects / events 中看到 DeepBook Predict 真实交易结果。
```
