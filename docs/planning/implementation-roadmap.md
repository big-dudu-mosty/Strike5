# Strike5 Implementation Roadmap

本文档用于指导 Strike5 Arena 从当前交易闭环进入 Arena、排行榜、晒单、Sealed Calls 和 Combo 的实现阶段。

目标不是一次性把所有功能写完，而是按可验证的里程碑推进，保证每一步都符合 DeepBook Predict 技术边界和黑客松 demo 需求。

## 1. 当前基线

项目已经完成或确认的真实链路：

```text
BTC K-line
-> DeepBook Predict active oracle
-> Arena round based on current BTC expiry
-> Above / Below / Range challenge
-> dUSDC fixed-risk quote
-> PredictManager account
-> mint / mint_range
-> position display
-> OracleSVI settlement
-> redeem / redeem_range
```

新的产品主线：

```text
Round Arena
-> opt-in leaderboard
-> verified calls / showcases
-> sealed calls
-> combo score multiplier
```

项目不做：

- ETH / SUI / SOL 等非 BTC oracle 预测，除非 DeepBook Predict testnet 官方提供对应 oracle。
- 任意新闻 / 体育 / 政治事件预测。
- 自建事件 oracle。
- 真钱串关乘法赔付。
- 主网资产路由到 testnet dUSDC。
- DeepBook Margin / Iron Bank 组合策略。
- Cross-venue arbitrage。
- 自动 vault strategy。

## 2. 实现原则

1. 真实 mint / redeem 闭环优先级高于任何玩法层。
2. 所有 Arena challenge 必须能映射到 DeepBook Predict `MarketKey` 或 `RangeKey`。
3. 前端构造 PTB，钱包签名，Sui RPC 提交。
4. Predict Server 用于展示和索引，关键交易状态通过 Sui RPC 确认。
5. Chart Price 和 Oracle Spot 必须明确区分。
6. 排行榜默认 opt-out；只有用户主动 opt-in 才展示。
7. Sealed Calls 只能承诺隐藏社交观点内容，不能承诺隐藏底层链上交易。
8. Combo MVP 只乘倍 Arena score，不改变 DeepBook Predict 原生 payout。
9. 所有影响产品主线、交易语义、隐私边界或 demo 讲法的选择，都要写入 `docs/decisions/`。

## 3. Milestone 0: Planning Baseline

状态：已完成，现由 `0020-arena-privacy-social-loop.md` 更新产品主线。

验收：

- `README.md` 有文档入口。
- `docs/product/product-spec.md` 明确产品逻辑。
- `docs/technical/architecture.md` 明确系统架构。
- `docs/technical/deepbook-integration.md` 明确 DeepBook 接入边界。
- `docs/demo/demo-plan.md` 明确演示流程。
- `docs/planning/implementation-roadmap.md` 明确实现顺序。
- `docs/decisions/` 有决策留存机制。

## 4. Milestone 1: App Scaffold

状态：已完成。

当前完成内容：

- Vite + React + TypeScript 项目已建立。
- pnpm lockfile 已生成。
- Tailwind CSS v4 已接入。
- Sui dApp Kit provider 已接入。
- 基础页面 shell 已建立。
- Chart / Market Pulse / Trade Panel / Positions 面板已建立。
- `pnpm build` 已通过。
- `pnpm lint` 已通过。

## 5. Milestone 2: Config and Data Foundation

状态：已完成。

当前完成内容：

- `PREDICT_CONFIG` 已建立。
- Predict Server client 已建立。
- Predict Server response types 已建立。
- `usePredictMarketOverview` 已建立。
- Market Pulse 已显示 Oracle Spot、Forward、Freshness、Current Expiry、Next Expiry。
- Vault / PLP summary 已可通过 Predict Server 读取，当前不作为主交易界面面板展示。
- Chart Price 已通过 CryptoCompare BTC K-line provider 接入。

## 6. Milestone 3: Chart and Market Pulse

状态：已完成基础版本。

当前完成内容：

- CryptoCompare K-line client 已接入。
- 支持 1m / 5m / 15m candles。
- `lightweight-charts` 已渲染真实 BTC candles。
- Oracle Spot 已作为 chart price line 显示。
- 当前选择的 Above / Below strike 或 Range lower / higher 已作为 chart overlay 显示。
- Market Pulse 已显示 Chart Price。
- Market Pulse 已显示 Chart / Oracle Diff。
- Chart trade overlay 决策已记录在 `docs/decisions/0014-chart-trade-overlays.md`。

## 7. Milestone 4: Wallet and PredictManager

状态：已完成基础账户入口。

当前完成内容：

- Wallet 连接状态已接入主页面。
- dUSDC 钱包余额通过 Sui testnet RPC 读取。
- `GET /managers?owner=<wallet_address>` 已用于发现用户 PredictManager。
- `predict::create_manager` PTB 已由前端构造并通过钱包签名提交。
- 交易确认后解析 `PredictManagerCreated` 事件，并刷新 Predict Server 查询。
- dUSDC deposit / withdrawal PTB 已建立，当前主界面以直接开仓自动补款为主。
- Manager dUSDC、account value、open positions 已从 manager summary 展示。

相关决策：

- `0007-predict-manager-account-flow.md`
- `0008-separate-dusdc-deposit-before-mint.md`
- `0015-manager-withdrawal-flow.md`
- `0016-direct-order-auto-top-up.md`

## 8. Milestone 5: Quote and Challenge Cards

状态：Quick Picks 与 Custom Builder quote preview 已完成；下一步要把交易卡片改造成 Arena Challenge Cards。

已完成：

- Above / Below / Range 卡片已支持选择状态。
- Quick Picks 会基于 active Oracle Spot 生成 strike / range。
- Quick Picks 和 Custom Builder 都会按 oracle strike grid snapping。
- Custom Builder 支持用户输入 Above / Below strike，以及 Range lower / higher strikes。
- 当前选择的 custom strike / range 会同步显示在 BTC chart overlay 上。
- 仓位大小由用户输入；未输入金额前不请求 quote，也不能 mint。
- quote preview 通过 `simulateTransaction` 调用 `get_trade_amounts` / `get_range_trade_amounts`。
- preview 已显示 cost、max payout、live redeem 和 max loss。
- opening cutoff 已在临近到期时阻止 quote。

待改造：

- 把 Quick Picks 语言改成 Round Challenge。
- 增加 Round id / expiry header。
- 增加 challenge status：available / joined / closed / settled。
- Custom Builder 保留为高级入口。

## 9. Milestone 6: Mint Transactions

状态：直接下单 mint 流程已完成。

当前完成内容：

- Above / Below 已接入 `predict::mint<dUSDC>`。
- Range 已接入 `predict::mint_range<dUSDC>`。
- mint 交易复用当前 quote preview 的 strike / range / quantity 参数。
- 如果 Manager dUSDC 低于用户输入的仓位大小，前端会在同一 PTB 中自动 `deposit<dUSDC>` 预留缺口后再 mint。
- 开仓前会先 `simulateTransaction` 预检。
- 主界面已移除手动 deposit / withdraw 表单；直接开仓时由 mint PTB 自动补足 Manager 余额缺口。
- 交易成功后刷新 manager summary、market overview 和 quote preview。
- 交易成功后显示 tx digest。

待完成：

- 把按钮文案和成功状态从交易语境改成 Join Round / Joined Challenge。
- active position early exit 暂未接入。
- partial redeem 暂未接入。

## 10. Milestone 7: Positions and Redeem

状态：仓位展示和到期 redeem 已完成主要闭环。

当前完成内容：

- 方向仓位使用 Predict Server position summary。
- Range 仓位使用 mint/redeem 事件聚合。
- 已展示 market / expiry 状态。
- 已展示 redeemable positions。
- 已构造 redeem PTB。
- 已支持 `redeem<dUSDC>`。
- 已支持 `redeem_range<dUSDC>`。
- payout 回到 PredictManager。

待改造：

- 增加 Round result reveal 视图。
- 结算后支持生成 verified showcase。
- 结算后更新 leaderboard / streak / combo 状态。

## 11. Milestone 8: Arena Layer

状态：新方向，待实现。

目标：

把当前交易终端转成 Arena 体验。

预计工作：

- 新增 Round Arena section。
- 将 active oracle expiry 映射为 current round。
- 为每个 round 生成 challenge cards。
- 显示 round countdown / closed / settlement / revealed 状态。
- 用户已参与的 challenge 显示 joined 状态。
- 结算后显示 settlement price 和 win/loss。

验收：

- 用户能理解“当前一轮”。
- 每张 challenge 都能真实 quote / mint。
- 到期后能展示开奖感，而不是只看仓位表。

## 12. Milestone 9: Opt-in Leaderboard

状态：待实现。

目标：

实现隐私感知排行榜。

预计工作：

- 设计 opt-in 状态。
- 支持用户加入 / 隐藏 leaderboard。
- 统计 completed rounds。
- 统计 win rate。
- 统计 streak。
- 至少 5 局才进入主榜。
- Top 10 展示。
- 胜率相同按 PnL，再按参与局数排序。

实现选择：

- MVP 可以先用应用层存储 opt-in 记录和 alias。
- 战绩数据从 Predict Server 和用户 PredictManager 事件聚合。
- 如果没有后端，demo data 必须明确标注，不得冒充链上统计。

验收：

- 未 opt-in 用户不展示。
- opt-in 用户可以看到自己的公开状态。
- Top 10 排序规则清楚。

## 13. Milestone 10: Social Feed and Showcase

状态：待实现。

目标：

让用户可以发表观点和赛后晒单。

预计工作：

- Public Call composer。
- Showcase composer。
- Post 列表。
- tx digest link。
- round / expiry 绑定。
- settlement result 绑定。
- verified badge。

验收：

- 用户能发表 Call。
- 用户能基于 settled position 生成 Showcase。
- Showcase 能链接到真实 tx digest 或 position result。

## 14. Milestone 11: Sealed Calls

状态：待实现。

目标：

接入或模拟清晰的 Sealed Calls 产品流，优先保证隐私边界表达准确。

预计工作：

- Sealed Call composer。
- locked 状态。
- reveal-after-settlement 状态。
- 如果接入 Sui Seal：实现 client-side encryption、policy-gated decryption、reveal 流程。
- 如果暂未接入 Seal：UI 必须标注 demo-only，不说成真实加密。

隐私边界：

```text
Sealed Calls 隐藏的是社交观点内容。
不隐藏 mint / redeem 链上交易。
```

验收：

- 用户能看懂 sealed -> reveal 的流程。
- 文案不夸大链上隐私。
- 如果接入 Seal，能展示加密对象和 reveal。

## 15. Milestone 12: Combo Consecutive Streak

状态：重新定义，待实现。详见 `docs/decisions/0021-combo-consecutive-streak-and-live-pnl.md`。

目标：

把 Combo 从"一次性锁 3 腿草稿"改成**连续轮次连胜挑战**。

预计工作：

- 把 `lib/combo.ts` 从一次性 slip 改成 streak 模型；`getComboMultiplier` 改为 `2^命中数`。
- 1 关 = 1 个真实 oracle 到期轮次，第 k+1 关必须开在第 k 关紧接着的下一个到期。
- 赢一关解锁下一关，倍率 `2x -> 4x -> 8x`；任意一关 `lost` 即断线清零。
- 跳过某一轮则连胜过期重置；断线后允许用当前轮立刻重开。
- 输赢判定复用 `usePredictPositions` 的 `redeemable` / `lost`。
- `ComboPanel.tsx` 改成连胜进度 UI（leg 1/2/3、倍率灯、断线红）。
- `TradePanel.tsx` 的 combo 动作语义改成"用这单开启 / 续接连胜"。
- 下一个 oracle 未就绪时诚实提示，不伪造连续性。

边界：

```text
Predict payouts settle normally.
Combo multiplies Arena score and reputation only.
1 leg = 1 real oracle expiry; no sub-15-minute on-chain settlement is faked.
```

验收：

- Combo 不改变链上 payout。
- 每关都绑定到连续、真实结算的 oracle 轮次。
- 倍率固定翻倍，断线清零，状态清楚。

## 15a. Milestone 12b: Single-Round Live PnL

状态：待实现。详见 `docs/decisions/0021-combo-consecutive-streak-and-live-pnl.md`。

目标：

让 15 分钟轮次内不再是干等开奖，补足即时刺激。

预计工作：

- 新增一个拿 live mark / `liveRedeem` 值的 hook（复用 quote / simulate 路径）。
- 在 `PositionsPanel.tsx` 的进行中仓位卡片上展示 `当前退出价 - 成本` 的浮动 PnL。
- 按现有 5s 轮询节奏刷新。

边界：

```text
实时 PnL 仅作参考反馈，最终输赢以 OracleSVI settlement price 为准。
```

验收：

- 进行中仓位能看到随 oracle 跳动的浮动盈亏。
- 不与 settlement 权威状态混淆。

## 15b. Milestone 12c: Cash Out 与连胜承诺规则

状态：待实现。详见 `docs/decisions/0022-continuous-cash-out-and-streak-commitment.md`。

目标：

让节奏与结算频率解耦：随时开仓、随时平仓；串关 leg 锁定到结算。

预计工作：

- 移除 `PRODUCT_TIMING.uiRoundMs` 与所有 5 分钟轮次文案。
- `PositionsPanel` 为 `active` 仓位加 Cash Out 按钮（复用 redeem / redeem_range PTB 未结算分支，展示当前 live 退出价）。
- 状态映射：ACTIVE+fresh 可平；stale 禁用并说明；到期未结算显示冻结；settled 走原有 redeem。
- 串关 leg 平仓前弹弃权确认；弃权后 streak 进入 surrendered 中性终态（不算败、不计 leaderboard loss）。
- 弃权检测：leg 对应仓位在 oracle 结算前数量减少即判弃权。

验收：

- 30 秒内可完成 开仓 -> 实时 PnL -> Cash Out 的真实链上闭环。
- 串关 leg 的承诺语义清晰：提前平 = 弃权,无"99% 确定再跑"漏洞。
- 冻结窗（到期未结算）如实呈现,不出现必失败的按钮。

## 16. Milestone 13: Demo Hardening

状态：持续进行。

预计工作：

- 收敛主界面信息架构。
- 增加 loading / empty / error states。
- 增加 demo wallet preparation guide。
- 增加 fallback flow。
- 增加 screenshot / browser QA。
- 准备 final pitch。

当前完成内容：

- create manager、deposit、withdraw、mint、redeem 成功状态已显示可点击 SuiVision testnet 交易链接。
- SuiVision transaction link 决策已记录在 `docs/decisions/0017-sui-vision-transaction-links.md`。
- Demo Readiness panel 已从主交易界面移除。
- 主界面已移除手动 deposit / withdraw 表单、顶部信息卡和 Vault & Oracle Health 面板，直接开仓成为唯一主交易路径。
- BTC K-line lookback 已扩展并分页拉取。
- Consumer demo surface simplification 决策已记录在 `docs/decisions/0019-consumer-demo-surface-simplification.md`。

## 17. 当前下一步

主线功能已全部落地：连胜 streak（M12）、实时 PnL（M12b）、Cash Out 与弃权规则（M12c，已真实测试）、5 分钟轮次残留清除、Arena 文案改造与"已参与"状态。

当前重点转入提交准备：

1. 按 demo-plan 4.5 节录制五分钟 demo 视频（官方评审结构）。
2. 演练 30 秒 open -> tick -> cash out 闭环 + 串关弃权演示。
3. Settlement reveal 视图增强（次优先）。
4. Sealed Calls 的 Sui Seal 技术 spike（stretch）。
5. 入门摩擦优化（主网阶段）：zkLogin + sponsored transactions，让 web2 预测玩家无钱包开玩；这是"吸引用户来 Sui"叙事的落地路径。
