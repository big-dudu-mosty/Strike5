# DeepBook Predict Integration

本文档定义 Strike5 MVP 预计接入的 DeepBook Predict 能力、对象关系、API/RPC 边界和交易流程。

注意：DeepBook Predict 仍处于 testnet 阶段。本文中的 package id、object id、entry point 和数据结构基于当前本地 `predict-testnet-4-16` 分支与 public testnet API，需要在正式提交或主网上线前再次确认。

## 1. 当前 testnet 配置

当前本地代码确认的 testnet 配置：

```text
Predict Server:
https://predict-server.testnet.mystenlabs.com

Predict Package:
0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138

Predict Object:
0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a

dUSDC Package:
0xe95040085976bfd54a1a07225cd46c8a2b4e8e2b6732f140a0fc49850ba73e1a

dUSDC Type:
0xe95040085976bfd54a1a07225cd46c8a2b4e8e2b6732f140a0fc49850ba73e1a::dusdc::DUSDC
```

这些值不要散落硬编码在业务组件里，应集中到 config：

```ts
export const PREDICT_CONFIG = {
  network: "testnet",
  predictServerUrl: "https://predict-server.testnet.mystenlabs.com",
  predictPackageId: "0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138",
  predictObjectId: "0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a",
  dusdcType:
    "0xe95040085976bfd54a1a07225cd46c8a2b4e8e2b6732f140a0fc49850ba73e1a::dusdc::DUSDC",
};
```

## 2. DeepBook Predict 核心对象

### 2.1 Predict Shared Object

`Predict` 是 top-level shared object。

它负责：

- quote asset allowlist。
- oracle 状态检查。
- market key / range key 校验。
- strike grid 校验。
- pricing 和 spread。
- utilization / risk config。
- vault exposure。
- PLP 相关会计。
- mint / redeem events。

文档和代码中建议称为：

```text
Predict Shared Object / predict.move
```

不要只写成模糊的 `DeepBook Predict Contract`。

### 2.2 PredictManager

`PredictManager` 是用户的 shared account object。

它内部保存：

- 用户 quote balance。
- binary position quantities。
- range position quantities。

重要实现边界：

```text
Above / Below / Range 仓位不是独立 position NFT 或独立 wallet object。
它们是 PredictManager 内部 table 里的 quantity。
```

因此 Position Panel 的状态来源应围绕 PredictManager 和 indexer events 设计。

### 2.3 OracleSVI

`OracleSVI` 表示一个 underlying asset + 一个 expiry。

Strike5 MVP 主要使用 BTC oracle。

OracleSVI 提供：

- spot
- forward
- SVI parameters
- expiry
- timestamp
- status
- settlement price

使用场景：

- active market selection
- quote pricing
- expiry countdown
- freshness display
- settlement

### 2.4 MarketKey

MarketKey 用于 Above / Below。

结构概念：

```text
oracle_id + expiry + strike + direction
```

方向：

```text
UP = Above
DOWN = Below
```

Settlement 语义：

```text
Above: settlement_price > strike
Below: settlement_price <= strike
```

### 2.5 RangeKey

RangeKey 用于 Range。

结构概念：

```text
oracle_id + expiry + lower_strike + higher_strike
```

约束：

```text
lower_strike < higher_strike
```

Settlement 语义：

```text
lower_strike < settlement_price <= higher_strike
```

### 2.6 Predict Vault / PLP

Predict Vault 是用户交易的对手方和流动性来源。

它负责：

- 接收用户 premium。
- 记录 vault exposure。
- 支付 redeem payout。
- 维护 vault balance / value / max payout / utilization。

PLP 是 vault liquidity 的 share token 方向。Strike5 MVP 不需要做 PLP supply 产品，但需要展示 vault health。

### 2.7 dUSDC

DeepBook Predict testnet 使用 dUSDC 作为 quote asset。

注意：

```text
dUSDC is not official USDC on testnet.
```

UI 要清楚展示用户需要 dUSDC。

## 3. Oracle 和周期

当前代码中的 oracle feed config 包含：

```text
enabled tiers: 15m, 1h, 1d, 1w
push tick: 1,000 ms
manager interval: 5 min
```

注意：

```text
manager interval 是当前 oracle feed service 的 operational config。
它不是 Strike5 的 settlement 来源，也不代表 DeepBook Predict 支持 5-minute onchain settlement。
Strike5 的 5-minute round 是产品层交易节奏。
真实 settlement 仍指向 nearest 15-minute oracle expiry。
```

当前产品设计采用：

```text
5-minute UI round
15-minute nearest oracle expiry
```

不要写成：

```text
DeepBook oracle 15 分钟才更新一次价格
```

更准确是：

```text
15 分钟是最短 expiry 间隔；oracle price updates 是高频更新。
```

Oracle freshness 当前代码阈值为 30 秒。UI 应展示 freshness，并在 stale 时禁止新交易或提示风险。

## 4. Strike Grid

当前 testnet 设计中，strike 需要符合 oracle grid。

代码层校验：

```text
strike >= min_strike
strike <= max_strike
(strike - min_strike) % tick_size == 0
```

当前 feed config 可按以下 UI 规则设计：

```text
min strike: 50,000 USD
max strike: 150,000 USD
tick size: 1 USD
```

前端必须：

- snap 用户输入。
- 拒绝越界 strike。
- range 中校验 lower < higher。
- 提交前展示最终使用的 strike。

## 5. Predict Server API 边界

Predict Server 可用于页面渲染。

推荐用途：

- active oracle list
- oracle state
- recent oracle prices
- SVI / market data
- vault summary
- portfolio summary, if the endpoint and response shape are confirmed
- historical events

示例 endpoints：

```text
GET /predicts/{predict_id}/oracles
GET /predicts/{predict_id}/state
GET /predicts/{predict_id}/vault/summary
GET /oracles/{oracle_id}/prices
GET /oracles/{oracle_id}/svi
```

边界：

```text
Predict Server 是 display / index layer。
交易前后的关键状态必须用 Sui RPC 确认。
```

关键状态包括：

- PredictManager object。
- OracleSVI object。
- dUSDC coin object。
- transaction effects。
- emitted events。
- post-trade balance and position quantity。

## 6. MVP 预计调用能力

以下基于当前 testnet README 与 Move code，正式实现前要按最新 package 确认。

| 产品功能 | 当前预计 DeepBook Predict 能力 |
|---|---|
| 创建用户账户 | create / find `PredictManager` |
| 存入资金 | deposit dUSDC into `PredictManager` |
| Above / Below quote | directional trade quote |
| Above / Below mint | `mint<dUSDC>` |
| Above / Below redeem | `redeem<dUSDC>` |
| Range quote | range trade quote |
| Range mint | `mint_range<dUSDC>` |
| Range redeem | `redeem_range<dUSDC>` |
| Vault data | Predict Server vault summary |
| Oracle data | Predict Server + Sui RPC + events/checkpoints |
| Portfolio data | Prefer PredictManager + Sui RPC + events; use Predict Server summary only after endpoint confirmation |

## 7. 用户账户流程

### 7.1 查找 PredictManager

用户连接钱包后：

1. 通过 `PredictManagerCreated` event、Predict Server / indexer 或本地缓存的 manager id 查找候选 `PredictManager`。
2. 通过 Sui RPC 读取候选 shared object。
3. 校验 manager owner 是否等于当前 wallet address。
4. 如果存在，加载 manager id、manager balance 和 positions。
5. 如果不存在，提示创建。

不要把 `PredictManager` 当成普通 owned wallet object 扫描。它是用户复用的 shared account object，关键状态需要通过 shared object 读取和交易事件确认。

### 7.2 创建 PredictManager

创建后需要保存：

- manager id
- owner
- tx digest
- created event

创建完成后刷新：

- dUSDC balance
- manager balance
- positions

## 8. 资金流程

用户交易需要 dUSDC。

有两层余额：

```text
wallet dUSDC coin balance
PredictManager internal dUSDC balance
```

MVP 可以先做清晰的两步流程：

```text
Deposit dUSDC into PredictManager
Then mint position
```

如果开发时间允许，可以做组合 PTB：

```text
deposit + mint in one transaction
```

但组合交易需要更仔细地处理 coin split、amount、failure 和 UX。

## 9. Quote 流程

Quote 不是随便前端估算。

推荐流程：

1. 从 Predict Server 获取 active oracle 和展示数据。
2. 用户选择 trade type / strike / range / amount。
3. 前端 snap strike。
4. 前端构造 key。
5. 使用 devInspect 调用 quote function。
6. 展示 authoritative quote preview。

确认页展示：

```text
trade type
strike / range
expiry
cost
estimated payout
max loss
oracle freshness
chart/oracle diff
```

## 10. Mint 流程

### 10.1 Above / Below

路径：

```text
Build MarketKey
-> devInspect quote
-> build PTB
-> wallet signs
-> submit tx
-> Predict.mint
-> PredictManager position quantity increases
-> vault accepts payment and records exposure
```

### 10.2 Range

路径：

```text
Build RangeKey
-> devInspect quote
-> build PTB
-> wallet signs
-> submit tx
-> Predict.mint_range
-> PredictManager range position quantity increases
-> vault accepts payment and records bounded range exposure
```

## 11. Redeem 流程

到期后 oracle settles。

用户 redeem：

```text
load redeemable position
-> build redeem PTB
-> wallet signs
-> submit tx
-> Predict.redeem / redeem_range
-> payout deposited into PredictManager
-> position quantity decreases
```

当前代码中 directional position 支持 `redeem_permissionless`。Range 当前按 owner 调用 `redeem_range` 处理；MVP 不依赖 range permissionless keeper。

## 12. Opening Cutoff

前端应在到期前停止开新仓。

推荐：

```text
60 - 90 seconds before expiry
```

原因：

- oracle 可能 pending settlement。
- transaction 可能赶不上。
- freshness 可能变化。
- 用户体验更稳定。

状态文案：

```text
Trading closed for this expiry. Waiting for settlement.
```

## 13. 状态刷新策略

### 13.1 普通刷新

使用 TanStack Query：

- active oracle: 1-3s refresh
- vault summary: 10-30s refresh
- positions: after tx and periodic refresh
- K-line: provider interval

### 13.2 交易后刷新

交易提交后：

1. 等待 tx digest。
2. 获取 transaction effects。
3. 解析 events。
4. 刷新 PredictManager。
5. 刷新 Predict Server indexed data。
6. 如果 indexer 延迟，先展示 optimistic state，但标注 pending confirmation。

## 14. 错误处理

必须覆盖：

- wrong network
- no wallet
- no dUSDC
- no PredictManager
- insufficient manager balance
- invalid strike
- invalid range
- stale oracle
- pending settlement
- trading paused
- quote changed
- transaction rejected
- transaction failed
- indexer lag

## 15. 本地代码参考

关键文件：

```text
deepbookv3-predict/packages/predict/README.md
deepbookv3-predict/packages/predict/sources/predict.move
deepbookv3-predict/packages/predict/sources/predict_manager.move
deepbookv3-predict/packages/predict/sources/oracle.move
deepbookv3-predict/packages/predict/sources/oracle_config.move
deepbookv3-predict/packages/predict/sources/market_key/market_key.move
deepbookv3-predict/packages/predict/sources/market_key/range_key.move
deepbookv3-predict/scripts/config/constants.ts
deepbookv3-predict/scripts/services/oracle-feed/config.ts
```

正式开发前先确认：

- package id
- predict object id
- dUSDC type
- active oracle response shape
- quote function call shape
- manager discovery method
- current public API endpoints
