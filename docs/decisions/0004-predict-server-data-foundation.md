# 0004: Predict Server Data Foundation

Status: Accepted
Date: 2026-06-02

## Context

Milestone 2 需要先把 DeepBook Predict 的真实 testnet 数据接入页面。当前可用的 public Predict Server 提供：

```text
GET /predicts/{predict_id}/oracles
GET /predicts/{predict_id}/state
GET /predicts/{predict_id}/vault/summary
GET /oracles/{oracle_id}/state
```

这些 endpoint 可以支持 Strike5 的 Market Pulse 和 Vault & Oracle Health 面板。

## Decision

Strike5 使用 Predict Server 作为展示 / index 数据源，先接入：

- active BTC oracle list
- nearest active oracle
- oracle latest price
- oracle freshness
- current expiry
- next expiry
- vault summary
- quote assets

具体实现：

```text
src/lib/predict-server/client.ts
src/lib/predict-server/types.ts
src/hooks/usePredictMarketOverview.ts
```

`usePredictMarketOverview` 每 5 秒刷新一次，用于页面展示。

## Rationale

这样能快速把 DeepBook Predict 的真实 testnet 状态展示出来，同时保持交易关键状态边界清晰。

Predict Server 适合：

- market rendering
- vault health
- oracle freshness
- demo visibility

但交易前后的关键状态仍需要：

- Sui RPC object reads
- devInspect
- transaction effects
- emitted events

## Consequences

正面影响：

- 页面不再只是静态占位。
- 用户能看到真实 Oracle Spot、expiry 和 Vault Health。
- 为后续 quote / mint / redeem 打基础。

限制：

- 当前还没有接入 BTC K-line provider，所以 Chart Price 仍然显示为 pending。
- Predict Server 数据可能有 indexer 延迟，不能单独作为交易权威状态。
- Portfolio summary endpoint 仍需实现前确认，不在本轮依赖。

## Alternatives Considered

### 直接从 Sui RPC 读取所有状态

未采用为第一步。原因是 RPC object parsing 更复杂，不适合 Milestone 2 的展示数据目标。

### 只使用 mock data

未采用。项目需要尽早展示真实 DeepBook Predict testnet 数据。

### 增加后端代理

暂不采用。当前 public Predict Server 可直接访问，MVP 先保持纯前端 dApp。

## Revisit When

以下情况需要重新评估：

- Predict Server API shape 改变。
- 浏览器 CORS 或 rate limit 出现问题。
- 交易前 quote / manager state 需要更强的 RPC 确认。
- 需要加入 portfolio summary 或 historical positions。
