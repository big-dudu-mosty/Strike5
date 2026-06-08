# 0001: MVP Architecture Baseline

Status: Accepted
Date: 2026-06-02

Supersession note: Product positioning in this record is superseded by `0020-arena-privacy-social-loop.md`. The DeepBook Predict technical baseline remains accepted.

## Context

Strike5 要参加 DeepBook Predict 赛道。项目需要贴合 DeepBook Predict，而不是做一个泛预测市场或技术堆叠 demo。

我们已经确认：

- 当前 DeepBook Predict testnet 最短 active BTC oracle expiry 按 15 分钟处理。
- Strike5 的 5 分钟是产品交易节奏，不是链上 settlement。
- 用户需要 BTC K-line 才能做短周期价格判断。
- K-line price 和 OracleSVI spot 必须区分。
- Predict Server 适合展示和索引，关键交易状态要通过 Sui RPC 确认。
- PredictManager 是用户复用的 shared account object，仓位数量存在 manager 内部。

## Decision

Strike5 MVP 采用以下基线：

```text
Chart-first BTC fixed-risk trading terminal
5-minute product round
nearest 15-minute DeepBook Predict oracle settlement
Above / Below / Range trade types
dUSDC quote asset
PredictManager account and position storage
Predict Vault / PLP liquidity
OracleSVI settlement
```

技术基线：

```text
React + TypeScript frontend
@mysten/dapp-kit for wallet
@mysten/sui for PTB and RPC
TanStack Query for data fetching
TradingView Lightweight Charts for K-line
Predict Server for display/index data
Sui RPC for authoritative state and tx submit
```

## Rationale

这个方案最贴合 DeepBook Predict 赛道要求：

- 真实使用 DeepBook Predict contract / shared object。
- 能展示 oracle、strike、range、vault 和 dUSDC。
- 能形成 mint / redeem 交易闭环。
- 用户体验清晰，不依赖复杂多协议组合。
- Demo 可以解释商业闭环：交易量、dUSDC 使用、PredictManager 创建和 PLP liquidity demand。

## Consequences

正面影响：

- MVP 范围清晰。
- 技术实现可控。
- Demo 叙事集中。
- 不会变成 DeepBook Margin / Iron Bank / Telegram / AI 的大杂烩。

限制：

- 不做原生 5-minute settlement。
- 不做多资产。
- 不做自动 vault。
- 不做 keeper network。
- 不做跨市场套利。

## Alternatives Considered

### Generic prediction market

未采用。原因是太像 Polymarket clone，不够贴合 DeepBook Predict 的 strike / vol-surface / vault 特点。

### News-driven prediction app

未采用。原因是 BTC 5-minute trading 更依赖 K-line 和 oracle，而不是新闻流。

### Multi-protocol DeFi loop

未采用。原因是 MVP 会过重，用户和评委不一定关心复杂协议堆叠。

### Telegram bot first

未采用。原因是交易终端更适合展示 DeepBook Predict 的核心能力。

## Revisit When

以下情况需要重新评估：

- DeepBook Predict mainnet 支持更短 expiry。
- 官方 entry point / object layout 发生重大变化。
- Hackathon 规则要求必须加入其他协议。
- MVP 交易闭环已经完成，准备进入 stretch goal。
