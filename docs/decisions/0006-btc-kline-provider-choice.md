# 0006: BTC K-line Provider Choice

Status: Accepted
Date: 2026-06-02

## Context

Milestone 3 需要把 BTC Chart placeholder 替换为真实 K-line，并让 Market Pulse 显示：

```text
Chart Price
Oracle Spot
Chart / Oracle Diff
```

我们需要一个适合 MVP 的 BTC K-line provider：

- 不需要 API key。
- 浏览器可直接访问。
- 支持 1m / 5m / 15m。
- 响应稳定。
- 能与 DeepBook Predict OracleSVI 明确区分。

测试结果：

- Coinbase Exchange candles 在当前环境响应较慢。
- Binance public klines 在当前环境超时。
- Yahoo Finance 返回 429。
- CoinGecko OHLC 在当前环境超时。
- CryptoCompare `histominute` 响应正常，并返回 `access-control-allow-origin: *`。

## Decision

Strike5 MVP 使用 CryptoCompare 作为 primary BTC K-line provider。

Endpoint:

```text
https://min-api.cryptocompare.com/data/v2/histominute
```

Intervals:

```text
1m  -> histominute, aggregate=1
5m  -> histominute, aggregate=5
15m -> histominute, aggregate=15
```

Pair:

```text
BTC / USD
```

## Rationale

CryptoCompare 满足当前 MVP 需求：

- Public endpoint 可用。
- 支持 CORS。
- 支持分钟级 OHLC。
- 支持 aggregate 参数生成 5m / 15m candles。
- 不需要先引入 backend proxy。

## Consequences

正面影响：

- Chart module 可以显示真实 BTC K-line。
- Market Pulse 可以显示 Chart Price 和 Chart / Oracle Diff。
- 用户能看到行情参考和 DeepBook Predict oracle 的区别。

限制：

- CryptoCompare 是外部参考行情，不是 DeepBook Predict settlement source。
- 如果 rate limit 或 API 变更，可能需要 fallback 或后端代理。
- 后续 demo 前需要再验证 provider 可用性。

## Alternatives Considered

### Coinbase Exchange candles

未采用为第一选择。当前环境响应慢，不适合 demo 稳定性。

### Binance klines

未采用。当前环境请求超时，且地区可用性风险更高。

### Yahoo Finance chart API

未采用。当前测试返回 429。

### CoinGecko OHLC

未采用。当前环境请求超时，且粒度控制不如 CryptoCompare 直接。

### DeepBook Predict oracle prices as chart data

不作为 primary K-line provider。原因是我们已经定义：

```text
Chart Price = external market reference
Oracle Spot = DeepBook Predict quote / settlement reference
```

把 oracle price history 当主 K-line 会弱化这个边界。后续可以作为 emergency fallback，但 UI 必须明确标注。

## Revisit When

以下情况需要重新评估：

- CryptoCompare 出现 CORS、rate limit 或稳定性问题。
- 需要更低延迟行情。
- 需要交易所级别真实 volume。
- 需要 WebSocket streaming candles。
- 需要后端聚合多行情源。
