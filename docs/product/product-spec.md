# Strike5 Product Spec

本文档定义 Strike5 的产品逻辑、页面结构、用户流程和 MVP 边界。

## 1. 产品目标

Strike5 要做的是一个面向用户的 BTC 短周期固定风险交易终端。

用户打开产品后，应该能完成下面这条闭环：

```text
看 BTC K 线
-> 查看 DeepBook Predict oracle spot 和 expiry
-> 选择 Above / Below / Range
-> 输入 dUSDC amount
-> 查看 quote 和最大亏损
-> 钱包签名交易
-> 仓位进入 PredictManager
-> 到期后 redeem
```

产品要让 DeepBook Predict 的能力变得可见：

- oracle-driven settlement
- strike / range trading
- volatility-surface pricing
- Predict Vault / PLP liquidity
- dUSDC quote asset
- Sui PTB transaction flow

## 2. 不做什么

Strike5 MVP 不做泛预测市场。

暂不做：

- 新闻竞猜。
- 世界杯 / 体育竞猜。
- Telegram bot。
- DeepBook Margin loop。
- Iron Bank 组合策略。
- Polymarket / Hyperliquid 套利。
- 自动 vault 策略。
- 复杂 AI 投资建议。

原因是 MVP 的重点必须收敛到：

```text
BTC K-line -> DeepBook Predict quote -> mint -> position -> settlement -> redeem
```

如果这个闭环没有跑通，其他功能都会变成噪音。

## 3. 用户画像

### 3.1 主要用户

Strike5 面向：

- BTC 短线交易者。
- 熟悉 1m / 5m / 15m K 线的人。
- 想做短周期方向判断，但不想承担杠杆爆仓风险的人。
- Sui 用户和 DeepBook 生态用户。
- 黑客松评委和协议方。

### 3.2 用户核心需求

用户真正关心：

- 当前 BTC 走势。
- 当前 oracle spot。
- 到期时间还有多久。
- 买入成本是多少。
- 最大亏损是多少。
- 如果判断正确能拿回多少。
- 到期后能不能顺利 redeem。

用户不关心我们堆了多少技术名词，所以界面表达要围绕交易决策，而不是技术展示。

## 4. 核心交易类型

Strike5 支持三类 DeepBook Predict 原生结构。

### 4.1 Above

用户选择一个 strike。到期 settlement price 高于 strike，则仓位胜出。

```text
settlement_price > strike
```

示例：

```text
BTC Above 74,000 at 15:00
```

产品表达：

```text
BTC closes above 74,000
```

### 4.2 Below

用户选择一个 strike。到期 settlement price 小于或等于 strike，则仓位胜出。

```text
settlement_price <= strike
```

示例：

```text
BTC Below 74,000 at 15:00
```

产品表达：

```text
BTC closes at or below 74,000
```

### 4.3 Range

用户选择 lower strike 和 higher strike。到期 settlement price 落入区间，则仓位胜出。

DeepBook Predict 当前 range 语义：

```text
lower_strike < settlement_price <= higher_strike
```

示例：

```text
BTC Range 73,800 - 74,200 at 15:00
```

产品表达：

```text
BTC closes inside 73,800 - 74,200
```

## 5. 5 分钟和 15 分钟关系

这是产品里最容易讲错的地方。

当前 DeepBook Predict testnet 的最短 active BTC expiry 间隔是 15 分钟。因此：

```text
Strike5 的 5 分钟 = 产品交易轮次
DeepBook Predict 的 15 分钟 = 当前实际链上 oracle settlement 周期
```

Strike5 不伪造 5 分钟链上结算。

### 5.1 产品时间线

| 时间窗口 | 产品状态 | 结算目标 |
|---|---|---|
| 14:45 - 14:50 | Round 1，生成交易卡片 | 15:00 oracle |
| 14:50 - 14:55 | Round 2，刷新交易卡片 | 15:00 oracle |
| 14:55 - 14:58:30 | Round 3，最后开仓窗口 | 15:00 oracle |
| 14:58:30 - 15:00 | 停止开仓 | 等待 settlement |
| 15:00 之后 | redeem / 切换下一 expiry | 下一 15m oracle |

### 5.2 最后停止开仓窗口

建议 MVP 在到期前 60-90 秒停止开仓。

原因：

- 用户钱包签名有延迟。
- RPC 提交有延迟。
- oracle freshness 可能变化。
- oracle 会进入 pending settlement。
- 最后一秒交易失败会造成很差的体验。

UI 状态：

```text
Trading closed for this expiry. Waiting for settlement.
```

## 6. Trade Card 生成逻辑

交易卡片不是平台预先创建的一堆 offchain market，而是前端根据当前 oracle 和合法 strike grid 生成的 DeepBook Predict trade preview。

### 6.1 Quick Picks

Quick Picks 由系统自动生成。

输入：

- active oracle
- oracle spot
- expiry
- strike grid
- 当前价格波动
- 用户选择的 amount

推荐卡片：

- Above spot
- Below spot
- Range near spot
- Wider Range
- Optional momentum card

示例：

```text
Above 74,000
Below 74,000
Range 73,900 - 74,100
Range 73,750 - 74,250
```

### 6.2 Custom Builder

Custom Builder 允许用户自己指定：

- trade type
- strike
- lower strike
- higher strike
- dUSDC amount

前端负责：

- 校验输入。
- snap 到合法 tick。
- 显示调整后的 strike。
- 获取 quote。
- 生成 PTB。

## 7. Strike 校验

用户不能输入任意非法价格。

当前 testnet 配置可按以下规则设计 UI：

```text
min strike: 50,000 USD
max strike: 150,000 USD
tick size: 1 USD
```

前端处理规则：

1. 接收用户输入。
2. 转换为协议使用的 scaled integer。
3. 检查是否在 min / max 范围内。
4. 按 tick size snap。
5. 对 range 检查 lower < higher。
6. 交易确认前展示最终 strike。

示例：

```text
Input: 73,425.6
Snapped: 73,426
```

## 8. 页面结构

MVP 采用单页交易终端。

```text
1. Chart + Market Pulse
2. Trade Panel
3. Positions / Portfolio
```

### 8.1 Chart + Market Pulse

Chart 是主视觉，不能弱化。

必须展示：

- BTC K 线。
- 1m / 5m / 15m 切换。
- Chart Price。
- Oracle Spot。
- 当前选择的 strike line。
- 当前选择的 range band。
- expiry countdown。
- opening cutoff 状态。
- settlement marker。

Market Pulse 展示：

```text
Chart Price
Oracle Spot
Chart / Oracle Diff
Oracle Freshness
1m Change
5m Change
15m Change
Current Expiry
Next Expiry
```

重要边界：

```text
Chart Price = 外部行情参考
Oracle Spot = DeepBook Predict 报价和结算参考
```

如果两者偏差过大，提示用户：

```text
Chart and oracle prices differ. Quotes and settlement use DeepBook Predict oracle.
```

### 8.2 Trade Panel

Trade Panel 包含两个 tab：

```text
Quick Picks
Custom
```

每张交易卡片展示：

- trade type
- strike / range
- expiry
- time remaining
- cost
- estimated payout
- max loss
- oracle freshness
- trade button

### 8.3 Positions / Portfolio

Portfolio 展示 PredictManager 内的仓位。

注意：

```text
DeepBook Predict positions / ranges 不是独立 position object。
它们作为 quantity 存在 PredictManager 内部。
```

展示字段：

- trade type
- strike / range
- expiry
- quantity
- cost
- estimated value
- status
- settlement result
- redeem button

Market / expiry 状态和 position 状态不要混在一起。

Market / expiry 状态：

```text
OPEN_TO_TRADE
CLOSED_TO_NEW_TRADES
PENDING_SETTLEMENT
SETTLED
```

Position 状态：

```text
OPEN
REDEEMABLE
REDEEMED
```

### 8.4 Vault / PLP Protocol Context

Vault / PLP 是 DeepBook Predict 的交易对手方和流动性来源。MVP 主交易界面不展示独立 Vault & Oracle Health 面板；这些数据保留在文档、pitch 和未来 professional mode 中。

展示：

- Predict Vault balance
- Vault value
- Available liquidity
- Total max payout
- Utilization
- PLP share price
- Oracle status
- Oracle freshness
- Quote asset

## 9. MVP 验收标准

MVP 需要满足：

- 用户能连接钱包。
- 用户能看到 BTC K 线。
- 用户能看到 active oracle 和 expiry countdown。
- 用户能选择 Above / Below / Range。
- 用户能自定义 strike / range。
- 前端能 snap strike。
- 用户能看到 quote preview。
- 用户能签名并 mint。
- Position 能显示。
- 到期后能 redeem。
- Vault / Oracle Health 能显示真实数据。

如果只能展示 UI，不能完成 mint / redeem，则不算完整 MVP。

## 10. 商业闭环

Strike5 对 DeepBook 的价值：

- 带来真实用户交易。
- 增加 dUSDC 使用。
- 增加 PredictManager 创建。
- 增加 mint / redeem 链上交易。
- 增加 Predict Vault / PLP 流动性需求。
- 把 DeepBook Predict 包装成用户能理解的交易产品。

对用户的价值：

- 短周期 BTC 交易。
- 固定最大亏损。
- 没有杠杆爆仓。
- K 线驱动决策。
- onchain settlement。
- 到期 redeem。

对黑客松评委的价值：

- 不是 mock prediction UI。
- 不是单纯 frontend。
- 能展示 DeepBook Predict 的真实交易闭环。
