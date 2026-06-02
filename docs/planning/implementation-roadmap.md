# Strike5 Implementation Roadmap

本文档用于指导 Strike5 从文档阶段进入代码实现阶段。

目标不是一次性把所有功能写完，而是按可验证的里程碑逐步推进，保证每一步都符合项目逻辑、DeepBook Predict 技术边界和黑客松 demo 需求。

## 1. 当前基线

项目已经确定的核心逻辑：

```text
BTC K-line
-> DeepBook Predict active oracle
-> 5-minute product round
-> nearest 15-minute oracle expiry settlement
-> Above / Below / Range trade
-> dUSDC fixed-risk mint
-> PredictManager position accounting
-> OracleSVI settlement
-> redeem / redeem_range
```

项目不做：

- 泛预测市场。
- 新闻竞猜。
- DeepBook Margin / Iron Bank 组合策略。
- Telegram bot。
- Cross-venue arbitrage。
- 复杂 AI 投资建议。
- 自动 vault strategy。

## 2. 实现原则

1. 先打通真实交易闭环，再做增强体验。
2. 前端构造 PTB，钱包签名，Sui RPC 提交。
3. Predict Server 用于展示和索引，关键交易状态通过 Sui RPC 确认。
4. Chart Price 和 Oracle Spot 必须明确区分。
5. Position Panel 围绕 PredictManager 和事件数据设计。
6. 所有会影响架构、依赖、数据源、交易语义或 UX 规则的选择，都要写入 `docs/decisions/`。

## 3. Milestone 0: Planning Baseline

状态：已开始。

目标：

- 补齐产品、架构、DeepBook 接入和 demo 文档。
- 建立 implementation roadmap。
- 建立 ADR / decision record 机制。

验收：

- `README.md` 有文档入口。
- `docs/product/product-spec.md` 明确产品逻辑。
- `docs/technical/architecture.md` 明确系统架构。
- `docs/technical/deepbook-integration.md` 明确 DeepBook 接入边界。
- `docs/demo/demo-plan.md` 明确演示流程。
- `docs/planning/implementation-roadmap.md` 明确实现顺序。
- `docs/decisions/` 有决策留存机制。

## 4. Milestone 1: App Scaffold

目标：

建立最小可运行前端项目。

状态：基础 scaffold 已完成。

预计工作：

- 选择前端构建方案。
- 初始化 React + TypeScript app。
- 配置 package manager。
- 配置基础 lint / format / typecheck。
- 建立基础目录结构。
- 建立 config layer。

建议目录：

```text
src/
  app/
  components/
  hooks/
  lib/
    deepbook/
    sui/
    market-data/
  config/
  types/
```

需要决策留存：

- 前端构建工具选择。
- 包管理器选择。
- UI 样式方案选择。

验收：

- 本地 dev server 可启动。
- 首页可渲染基础 Strike5 shell。
- TypeScript 编译通过。
- README 或文档中记录启动命令。

当前完成内容：

- Vite + React + TypeScript 项目已建立。
- pnpm lockfile 已生成。
- Tailwind CSS v4 已接入。
- Sui dApp Kit provider 已接入。
- 基础页面 shell 已建立。
- Chart / Market Pulse / Trade Panel / Positions / Vault Health 面板占位已建立。
- `pnpm build` 已通过。
- `pnpm lint` 已通过。

## 5. Milestone 2: Config and Data Foundation

目标：

建立 DeepBook Predict、Sui 和 market data 的基础配置与客户端。

状态：Predict Server 数据基础已完成，BTC K-line provider 待后续 Milestone 3 决策和实现。

预计工作：

- 建立 `PREDICT_CONFIG`。
- 建立 Sui RPC client。
- 建立 Predict Server API client。
- 建立 oracle / vault summary fetcher。
- 建立基础类型定义。
- 建立 TanStack Query provider。

关键配置：

```text
network
predictServerUrl
predictPackageId
predictObjectId
dusdcType
suiRpcUrl
```

需要决策留存：

- 是否先使用 public Sui RPC。
- Predict Server 数据缓存策略。
- BTC K-line provider 选择。

验收：

- 能 fetch active oracles。
- 能 fetch vault summary。
- 能展示当前 active oracle expiry。
- 能展示 oracle spot / freshness。

当前完成内容：

- Predict Server client 已建立。
- Predict Server response types 已建立。
- `usePredictMarketOverview` 已建立。
- Market Pulse 已显示 Oracle Spot、Forward、Freshness、Current Expiry、Next Expiry。
- Vault & Oracle Health 已显示 vault balance、vault value、available liquidity、total max payout、utilization 和 PLP share price。
- Chart Price 仍等待 BTC K-line provider 接入。

## 6. Milestone 3: Chart and Market Pulse

目标：

完成用户决策所需的视觉基础。

预计工作：

- 接入 BTC K-line provider。
- 展示 1m / 5m / 15m K 线。
- 展示 Chart Price。
- 展示 Oracle Spot。
- 展示 Chart / Oracle Diff。
- 展示 Oracle Freshness。
- 展示 expiry countdown。

需要决策留存：

- K-line provider。
- Chart library 配置方式。
- Oracle / chart price divergence threshold。

验收：

- 页面能同时看到 Chart Price 和 Oracle Spot。
- 两者偏差能显示。
- Countdown 正确指向 nearest active 15m expiry。

## 7. Milestone 4: Wallet and PredictManager

目标：

完成用户账户入口。

预计工作：

- 接入 Sui wallet。
- 检查当前网络。
- 展示 wallet address。
- 展示 wallet dUSDC balance。
- 查找用户 PredictManager。
- 支持创建 PredictManager。
- 展示 manager dUSDC balance。

需要决策留存：

- PredictManager discovery 方法。
- 是否做本地 manager id cache。
- deposit 是否与 mint 拆开。

验收：

- 用户能连接 wallet。
- 用户能看到 dUSDC 状态。
- 用户能创建 / 加载 PredictManager。
- 关键状态通过 Sui RPC 确认。

## 8. Milestone 5: Trade Panel and Quote

目标：

完成 Above / Below / Range 的交易预览。

预计工作：

- 生成 Quick Picks。
- 实现 Custom Builder。
- 实现 strike / range snapping。
- 构造 MarketKey / RangeKey 参数。
- 使用 devInspect 获取 quote。
- 展示 cost / estimated payout / max loss。
- 展示 opening cutoff 状态。

需要决策留存：

- Quick Picks 生成策略。
- 默认 amount。
- opening cutoff 具体秒数。
- quote 失败时的 UX。

验收：

- 用户能选择 Above / Below / Range。
- 用户能输入 custom strike / range。
- invalid strike / range 会被阻止。
- quote preview 可显示。

## 9. Milestone 6: Mint Transactions

目标：

完成真实开仓交易。

预计工作：

- 构造 mint PTB。
- 支持 Above / Below mint。
- 支持 Range mint。
- 处理 wallet signing。
- 提交交易。
- 读取 tx effects / events。
- 刷新 manager balance 和 positions。

需要决策留存：

- deposit + mint 是否合并。
- 交易成功后的 optimistic UI 规则。
- 交易失败重试规则。

验收：

- 用户能真实 mint Above / Below。
- 用户能真实 mint Range。
- minted position 能出现在 Positions panel。
- tx digest 可查看。

## 10. Milestone 7: Positions and Redeem

目标：

完成仓位展示和到期 redeem。

预计工作：

- 展示 open positions。
- 展示 market / expiry 状态。
- 展示 redeemable positions。
- 构造 redeem PTB。
- 支持 `redeem<dUSDC>`。
- 支持 `redeem_range<dUSDC>`。
- 刷新 payout 和 manager balance。

需要决策留存：

- Position 数据来源优先级。
- settled position demo 准备方式。
- 是否显示历史 redeemed positions。

验收：

- 到期后仓位能进入 redeemable 状态。
- 用户能执行 redeem / redeem_range。
- payout 进入 PredictManager。

## 11. Milestone 8: Vault Health and Demo Hardening

目标：

让项目适合黑客松演示。

预计工作：

- 完成 Vault & Oracle Health panel。
- 增加 loading / empty / error states。
- 增加 demo wallet preparation guide。
- 增加 fallback flow。
- 增加 screenshot / browser QA。
- 准备 final pitch。

验收：

- Demo 能展示真实交易闭环。
- 现场网络 / indexer 延迟有备用方案。
- 页面没有明显布局错乱。
- 核心讲法和文档一致。

## 12. 当前下一步

下一步进入 Milestone 2: Config and Data Foundation。

建议下一轮先做：

1. Predict Server API client。
2. Active oracle fetch。
3. Vault summary fetch。
4. Market Pulse 中显示真实 oracle / vault 数据。
