# Strike5

> **Strike5 Arena — a fixed-risk BTC scalping arena powered by DeepBook Predict.**
>
> Settlement is slow, but markets are fast. DeepBook Predict's vault is a continuous counterparty with vol-surface pricing, so positions can be sold back at the live bid at any time before settlement. Strike5 productizes that: open a position, watch live PnL tick, cash out in seconds — all on-chain on Sui. A streak parlay rewards those who dare to lock legs to settlement: win 3 consecutive rounds for 8x arena score; cash out early and you forfeit the streak. Every mint and cash-out pays spread into the Predict vault, making the pace mechanics a volume engine for PLP.
>
> Real on-chain loop on Sui testnet: `quote (simulation) -> mint / mint_range -> live PnL -> cash out (unsettled redeem at live bid) -> settlement redeem`. All contract IDs live in `src/config/predict.ts` — mainnet migration is a config swap.

Strike5 Arena 是一个基于 **DeepBook Predict** 的 BTC 短周期预测竞技场。

用户在产品里看 BTC K 线和 DeepBook Predict Oracle Spot，每个 active BTC expiry 都是一轮 Arena。用户用 dUSDC 参与 Above / Below / Range 挑战，真实报价、仓位记录、流动性、风险暴露和到期结算都由 DeepBook Predict on Sui 负责。

## 一句话定位

> Strike5 Arena is a privacy-aware BTC prediction arena powered by DeepBook Predict.

更具体地说：

> 结算很慢，但市场很快。Predict 的 vault 是连续报价的对手方：用户通过钱包签名 PTB 完成 mint / mint_range，看实时 PnL 跳动，并可在结算前随时按 live bid Cash Out（redeem 未结算分支）；持有到期则按 OracleSVI settlement price 结算。连胜串关奖励敢锁仓到结算的人，配合 opt-in leaderboard、verified showcase 和 Sealed Calls 形成竞技和社交循环。

## 核心定位

Strike5 不是泛预测市场，也不是体育、政治或新闻事件投注平台。

它的核心是：

```text
BTC 短周期价格判断
+ DeepBook Predict 原生 strike / range 仓位
+ dUSDC 固定风险交易
+ 连续交易：实时 PnL + 随时 Cash Out（live bid 卖回 vault）
+ Predict Vault / PLP 做流动性和对手方
+ OracleSVI 到期结算（串关与开奖锚点）
+ 连胜串关（锁仓到结算，提前平即弃权）
+ opt-in leaderboard
+ verified social feed
+ sealed calls
```

当前 MVP 不伪造 ETH / SUI / SOL oracle，也不伪造任意事件结算。

## 为什么贴合 DeepBook Predict 赛道

DeepBook Predict 的价值不只是列出几个二元事件，而是提供：

- 基于 oracle 的到期结算。
- 按 strike 和 expiry 组合出的可编程市场。
- 基于 volatility surface 的定价能力。
- 由 Predict Vault / PLP 承担交易对手方和流动性。
- dUSDC quote asset。
- 可被 Sui DeFi 组合的链上账户与仓位状态。

Strike5 Arena 直接使用这些能力，把它包装成一个用户能反复参与、能公开战绩、能晒单、能做 sealed prediction calls 的产品。

## 关键产品规则

当前 DeepBook Predict testnet 可真实测试的主线是 BTC oracle market。

Strike5 不声称提供不存在的链上市场，也不声称隐藏底层链上交易。产品采用：

```text
DeepBook Predict BTC expiry = 实际链上 settlement（串关与开奖的结算锚点）
连续交易 = oracle 存活期间随时 mint，随时按 live bid Cash Out
Leaderboard = opt-in 展示
Sealed Calls = 隐藏赛前观点内容，不隐藏 mint / redeem 交易
Combo = 连续轮次连胜串关，固定翻倍乘倍 Arena score，不乘倍链上 payout；
        串关 leg 锁到结算，提前 Cash Out 即弃权
```

示例：

| 阶段 | Strike5 行为 | DeepBook Predict 行为 |
|---|---|---|
| Oracle live | 展示 challenge cards / 实时 PnL | active BTC OracleSVI 可 quote |
| User joins | 钱包签名 PTB | `mint` / `mint_range` |
| Cash out anytime | 按当前 live 价平仓落袋 | `redeem` / `redeem_range`（未结算分支，live bid） |
| Near expiry | 停止新开仓（cutoff），仍可 Cash Out | 等待 oracle settlement |
| Expired, unsettled | 仓位冻结，如实展示 | 拒绝 redeem（防抢跑空窗） |
| Settled | reveal result / update stats / 判定串关 | `redeem` / `redeem_range`（结算价） |
| Post-round | showcase / leaderboard / combo | Predict events 可索引 |

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
- Round Arena。
- Above / Below / Range challenge cards。
- Custom strike / range builder。
- Strike grid snapping 和校验。
- Quote preview。
- PTB 构造和钱包签名。
- mint / mint_range。
- Position panel + 实时浮动 PnL。
- Cash Out（未结算 live bid 平仓）。
- redeem / redeem_range。
- 连胜串关（含弃权规则）。
- opt-in leaderboard。
- verified call / showcase feed。

P1 / Stretch：

- Sealed Calls with Sui Seal。
- Combo score multiplier。
- Settlement reveal polish。
- Nautilus verified scoring spike。

暂不进入 MVP：

- ETH / SUI / SOL 预测，除非官方 Predict oracle 可用。
- 任意新闻 / 体育 / 政治事件市场。
- 真钱串关乘法赔付。
- DeepBook Margin。
- Iron Bank。
- Telegram bot。
- Cross-venue arbitrage。
- 主网资产路由到 testnet dUSDC。
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

官方文档和参考：

- https://docs.sui.io/onchain-finance/deepbook-predict/
- https://docs.sui.io/onchain-finance/deepbook-predict/design
- https://docs.sui.io/onchain-finance/deepbook-predict/contract-information/predict-manager
- https://www.sui.io/privacy
- https://blog.sui.io/introducing-decentralized-seal-key-server-testnet/
- https://www.sui.io/nautilus
