# Strike5

Strike5 是一个基于 **DeepBook Predict** 的 BTC 短周期固定风险交易终端。

用户在产品里看 BTC K 线，用 5 分钟的节奏判断短期方向或价格区间，然后用 dUSDC 买入 DeepBook Predict 原生的 Above / Below / Range 仓位。真实报价、仓位记录、流动性、风险暴露和到期结算都由 DeepBook Predict on Sui 负责。

## 一句话定位

> Strike5 is a chart-first BTC micro-options terminal powered by DeepBook Predict.

更具体地说：

> 用户从 BTC K 线出发，选择 Above / Below / Range 固定风险仓位，通过 Sui 钱包签名 PTB，调用 DeepBook Predict 的 Predict shared object 完成 mint / mint_range / redeem，最终以 OracleSVI settlement price 结算。

## 核心定位

Strike5 不是泛预测市场，也不是体育博彩或新闻竞猜产品。

它的核心是：

```text
BTC 短周期价格判断
+ DeepBook Predict 原生 strike / range 仓位
+ dUSDC 固定风险交易
+ Predict Vault / PLP 做流动性和对手方
+ OracleSVI 到期结算
```

产品形态应该更接近轻量交易终端，而不是社交投注平台。

## 为什么贴合 DeepBook Predict 赛道

DeepBook Predict 的价值不只是列出几个二元事件，而是提供：

- 基于 oracle 的到期结算。
- 按 strike 和 expiry 组合出的可编程市场。
- 基于 volatility surface 的定价能力。
- 由 Predict Vault / PLP 承担交易对手方和流动性。
- dUSDC quote asset。
- 可被 Sui DeFi 组合的链上账户与仓位状态。

Strike5 直接使用这些能力，把它包装成一个用户能理解的 BTC 短周期交易产品。

## 关键产品规则

当前 DeepBook Predict testnet 已确认的最短 active BTC oracle expiry 间隔是 **15 分钟**。

因此 Strike5 不声称提供原生 5 分钟链上结算。产品采用：

```text
5 分钟产品交易轮次
15 分钟 DeepBook Predict oracle settlement
```

示例：

| 时间窗口 | Strike5 行为 | DeepBook Predict 结算 |
|---|---|---|
| 14:45 - 14:50 | 第 1 轮交易卡片 | 15:00 expiry |
| 14:50 - 14:55 | 第 2 轮交易卡片 | 15:00 expiry |
| 14:55 - 14:58:30 | 第 3 轮交易卡片 | 15:00 expiry |
| 14:58:30 - 15:00 | 停止开仓 | 等待 settlement |
| 15:00 之后 | 用户 redeem | 进入下一轮 expiry |

这保证了产品体验足够短周期，同时不偏离 DeepBook Predict 当前 testnet 的真实能力。

## 文档目录

- 产品规格: `docs/product/product-spec.md`
- 技术架构: `docs/technical/architecture.md`
- DeepBook 接入: `docs/technical/deepbook-integration.md`
- Demo 计划: `docs/demo/demo-plan.md`
- 实现路线图: `docs/planning/implementation-roadmap.md`
- 工程工作流: `docs/planning/engineering-workflow.md`
- 决策记录: `docs/decisions/README.md`

## 本地开发

安装依赖：

```bash
pnpm install
```

启动开发服务器：

```bash
pnpm dev
```

构建检查：

```bash
pnpm build
```

Lint：

```bash
pnpm lint
```

## MVP 范围

必须完成：

- Sui wallet connect。
- Sui testnet 环境。
- dUSDC balance 展示。
- PredictManager 查找 / 创建。
- BTC K 线。
- DeepBook Predict oracle spot、expiry、countdown。
- Above / Below / Range Quick Picks。
- Custom strike / range builder。
- Strike grid snapping 和校验。
- Quote preview。
- PTB 构造和钱包签名。
- mint / mint_range。
- Position panel。
- redeem / redeem_range。
- Vault & Oracle Health panel。

暂不进入 MVP：

- DeepBook Margin。
- Iron Bank。
- Telegram bot。
- Cross-venue arbitrage。
- 复杂 AI 新闻分析。
- 自动 keeper network。
- 自动 vault strategy product。

## 本地与官方参考

本项目讨论和设计基于 DeepBook Predict 本地仓库分支：

```text
predict-testnet-4-16
```

重点参考文件：

- `deepbookv3-predict/packages/predict/README.md`
- `deepbookv3-predict/packages/predict/sources/predict.move`
- `deepbookv3-predict/packages/predict/sources/predict_manager.move`
- `deepbookv3-predict/packages/predict/sources/oracle.move`
- `deepbookv3-predict/packages/predict/sources/oracle_config.move`
- `deepbookv3-predict/packages/predict/sources/market_key/market_key.move`
- `deepbookv3-predict/packages/predict/sources/market_key/range_key.move`
- `deepbookv3-predict/scripts/config/constants.ts`
- `deepbookv3-predict/scripts/services/oracle-feed/config.ts`

官方文档：

- https://docs.sui.io/onchain-finance/deepbook-predict/
- https://docs.sui.io/onchain-finance/deepbook-predict/design
- https://docs.sui.io/onchain-finance/deepbook-predict/contract-information/predict-manager
