# Strike5 Product Spec

本文档定义 Strike5 Arena 的产品逻辑、页面结构、用户流程和 MVP 边界。

## 1. 产品定位

Strike5 Arena 是一个基于 **DeepBook Predict** 的 BTC 短周期预测竞技场。

它不是单纯的 BTC 交易终端，而是把 DeepBook Predict 的 BTC oracle markets 包装成一套可持续参与的竞技和社交循环：

```text
进入当前 Round
-> 查看 BTC K 线 / Oracle Spot / 新闻信号
-> 选择 Above / Below / Range / Breakout 挑战
-> DeepBook Predict quote
-> 钱包签名 mint / mint_range
-> 仓位进入 PredictManager
-> 到期 settlement
-> redeem
-> 生成战绩 / 晒单 / 排行榜积分
-> 下一轮继续
```

一句话：

```text
Strike5 Arena turns DeepBook Predict's BTC markets into a privacy-aware social prediction arena.
```

## 2. 产品目标

MVP 要证明两件事：

1. Strike5 使用 DeepBook Predict 的真实链上预测市场能力，不是 mock UI。
2. 在只有 BTC oracle 的情况下，产品仍然可以通过 Arena、排行榜、晒单、Sealed Calls 和 Combo 形成更丰富的用户循环。

产品要让 DeepBook Predict 的能力变得可见：

- oracle-driven settlement
- strike / range trading
- volatility-surface pricing
- Predict Vault / PLP liquidity
- dUSDC quote asset
- PredictManager account model
- Sui PTB transaction flow

同时也要让用户感知到：

- 每个 expiry 是一轮 Arena。
- 每次预测都有固定最大亏损。
- 到期后可以链上 redeem。
- 胜率、streak 和晒单可以形成社交声誉。
- 用户默认不进榜，只有主动 opt-in 才公开展示。

## 3. 不做什么

Strike5 MVP 不做泛预测市场。

暂不做：

- ETH / SUI / SOL 等非 BTC oracle 预测，除非 DeepBook Predict testnet 官方提供对应 oracle。
- 体育、政治、新闻事件等任意事件预测。
- 自建事件 oracle 或人工结算。
- 真钱串关乘法赔付。
- DeepBook Margin loop。
- Iron Bank 组合策略。
- Polymarket / Hyperliquid 套利。
- Telegram bot。
- 自动 vault strategy。
- 主网资产路由到 testnet dUSDC。

原因是 MVP 必须牢牢绑定当前可真实测试的 DeepBook Predict testnet 能力：

```text
BTC OracleSVI -> quote -> mint / mint_range -> PredictManager -> settlement -> redeem
```

如果底层没有官方 oracle 或真实结算路径，就不能包装成已经可用的市场。

## 4. 用户画像

Strike5 面向：

- BTC 短线交易者。
- 喜欢 15 分钟内快速判断方向或区间的人。
- 想参与预测竞技、排行榜和晒单的人。
- 希望公开战绩但不想默认暴露完整身份的用户。
- Sui 用户、DeepBook 生态用户和黑客松评委。

用户真正关心：

- 当前 BTC 走势。
- 当前 DeepBook Predict oracle spot。
- 到期时间还有多久。
- 这一轮有哪些挑战。
- 买入成本是多少。
- 最大亏损是多少。
- 如果判断正确能拿回多少。
- 自己的胜率 / streak / 排名有没有变化。
- 到期后能不能顺利 redeem。

用户不关心我们堆了多少技术名词，所以界面表达要围绕 Arena 参与、预测结果、战绩和链上验证。

## 5. 核心协议能力

Strike5 不自己造预测市场结算。

底层映射：

```text
Above / Below
-> predict::mint<dUSDC>

Range / Calm
-> predict::mint_range<dUSDC>

到期赎回
-> predict::redeem<dUSDC> / predict::redeem_range<dUSDC>

用户仓位
-> PredictManager

市场状态 / 历史事件
-> predict-server
```

Position 和 Range 不是独立钱包对象。它们是 PredictManager 内部的 quantity，展示和排名需要从 Predict Server 或链上对象读取。

## 6. 核心预测类型

Strike5 支持 DeepBook Predict 原生结构，并在产品层包装成 Arena 挑战。

### 6.1 Above

用户选择一个 strike。到期 settlement price 高于 strike，则仓位胜出。

```text
settlement_price > strike
```

产品表达：

```text
BTC closes above 74,000
```

### 6.2 Below

用户选择一个 strike。到期 settlement price 小于或等于 strike，则仓位胜出。

```text
settlement_price <= strike
```

产品表达：

```text
BTC closes at or below 74,000
```

### 6.3 Range / Calm

用户选择 lower strike 和 higher strike。到期 settlement price 落入区间，则仓位胜出。

DeepBook Predict 当前 range 语义：

```text
lower_strike < settlement_price <= higher_strike
```

产品表达：

```text
BTC stays inside 73,800 - 74,200
```

### 6.4 Breakout

Breakout 是产品层包装，不是新合约类型。

MVP 可以用两个单独挑战表达：

```text
BTC breaks above upper strike
BTC breaks below lower strike
```

如果未来要做双向突破组合，需要额外设计组合购买和结果展示，不能把它说成 DeepBook Predict 原生单一仓位。

## 7. 连续交易、Cash Out 与 Expiry

详见 `docs/decisions/0022-continuous-cash-out-and-streak-commitment.md`。

Strike5 没有固定的产品轮次节奏。交易循环是**连续的**：

```text
oracle 存活期间随时 mint
-> 实时浮动 PnL 跳动
-> 随时 Cash Out（按当前 live bid 卖回 vault），或持有到结算
```

oracle expiry 不再是节奏来源，而是**结算锚点**：串关 leg 在这里判定输赢，reveal / redeem 在这里发生。长周期 oracle 不是缺陷，而是全天开放的赛场。

核心依据（合约已核实）：

```text
predict::redeem / redeem_range 有未结算分支：
按 live bid（扣 spread）即时卖回 vault，提前退出是协议一等能力。
```

Cash Out 可用窗口与合约状态一一对应：

```text
ACTIVE + 价格 30s 内新鲜    -> 可随时 Cash Out
oracle stale（>30s 无 tick）-> 暂时不可平，UI 说明原因
到期未结算（PENDING）        -> 冻结，等待结算，不可退出
SETTLED                     -> 按结算价 redeem（原有流程）
```

补充事实：`trading_paused` 只挡开仓，不挡退出——协议暂停交易时用户仍可平仓离场。

开仓侧保留 cutoff：到期前 60-90 秒停止开新仓，避免签名 / RPC / oracle 状态变化导致最后一秒失败。

UI 状态：

```text
Opening closed near expiry. Cash out or wait for settlement.
```

Strike5 不伪造任何短于真实 expiry 的链上结算；节奏来自用户自己的进出，而不是虚构的轮次时钟。

## 8. Arena 玩法

### 8.1 Round Arena

每个 active BTC oracle expiry 是一轮 Arena。

页面应展示：

- Round id 或 expiry 时间。
- Settlement countdown。
- Oracle Spot。
- 当前可参与的挑战。
- 本轮参与人数 / 已 opt-in 人数，若数据可得。
- 当前用户是否已参与。

挑战卡片示例：

```text
BTC closes above current spot
BTC closes below current spot
BTC stays inside range
BTC breaks above selected strike
```

每张卡片底层必须能映射到 `MarketKey` 或 `RangeKey`。

### 8.2 Opt-in Leaderboard

排行榜默认不展示任何未授权用户。

规则：

```text
默认不上榜
用户主动 opt-in 才展示
只显示 Top 10
至少完成 5 局才进入胜率榜
主排序：胜率
副排序：总 PnL
再副排序：参与局数
```

隐私口径：

```text
链上交易本身公开。
Strike5 不主动聚合、不展示未 opt-in 用户的战绩。
用户可以隐藏 profile；隐藏后不再出现在产品排行榜里。
```

### 8.3 Social Feed

Feed 分两类：

```text
Call：赛前观点
Showcase：赛后晒单
```

Call 示例：

```text
I call BTC Above 62,000 this round.
```

Showcase 示例：

```text
Won Round #204
Entry: Above 62,000
Payout: 18.4 dUSDC
Tx verified
```

每条内容应尽量绑定：

- wallet address 或用户 alias。
- PredictManager。
- round / expiry。
- market key 或 range key。
- tx digest。
- settlement result。

目标是 verified social feed，不是普通评论区。

### 8.4 Sealed Calls

Sealed Calls 是 Strike5 的隐私感知玩法。

用户可以赛前加密提交观点：

```text
I think BTC closes above 62,000
```

赛前别人看不到，防止抄单。到期后 reveal，证明用户确实提前预测。

技术叙事：

```text
Use Sui Seal for encrypted prediction calls and selective reveal after settlement.
```

MVP 可以先做产品层设计和 UI 状态；如果接入 Seal，则遵循 Sui Seal 的 client-side encryption 和 policy-gated decryption 模型。

重要边界：

```text
Sealed Calls 隐藏的是用户发表的观点内容。
它不隐藏 DeepBook Predict mint / redeem 链上交易本身。
```

### 8.5 Combo（连胜串关）

Combo 是**连续轮次连胜挑战**，不是一次性押多腿的彩票。

MVP 只做积分连胜，不做真钱乘法赔付。

核心规则：

```text
1 关 = 1 个真实 oracle 到期轮次（连续节点）
赢一关 -> 解锁下一关，倍率往上跳
任意一关挂掉 -> 断线，倍率清零
3 关全中 -> Arena score 8x
```

节点和倍率：

```text
Leg1 命中 -> 2x
Leg2 命中 -> 4x
Leg3 命中 -> 8x
固定翻倍，不用赔率连乘。
```

详细规则：

- 连续性：第 k+1 关必须开在第 k 关 oracle 紧接着的下一个到期。跳过某一轮则连胜过期重置。
- 方向自由：每关 Above / Below / Range 任选，只要赢即可。
- 下单大小：MVP 不限制。
- 断线后：允许用当前轮立刻重开一条新连胜。
- 输赢判定：直接复用持仓状态，`redeemable` = 赢，`lost` = 输，无需新增判定逻辑。
- **承诺规则（弃权）**：串关 leg 必须持有到结算才算数。结算前对 leg 提前 Cash Out = **弃权**，整条连胜立即终结。弃权是中性终态：不算败、不计入排行榜 loss、不点亮任何倍率，只是放弃这条连胜。UI 在对串关 leg 平仓前必须警告。
- 弃权规则天然不需要"到期前 X 分钟封盘"：哪怕 99% 确定要赢，提前平也作废，没有可钻的空子。

两种模式在链上是同一种仓位，区别只在 app 层：

```text
普通仓位 = 交易模式  -> 随时 Cash Out，无任何附带条件
串关 leg = 承诺模式  -> 锁到结算才算数，提前平 = 弃权
```

"随时可以跑,但跑了连胜就没了"——8x 的诱惑 vs 落袋为安,这个拉扯本身就是串关的玩点。

正确口径：

```text
Predict payouts settle normally. Combo multiplies arena score and leaderboard reputation.
```

不要说：

```text
真实 payout 直接相乘。
```

为什么不做"5 分钟一关、3 关叠成 15 分钟"：

```text
链上只在 oracle 到期结算，最短 15 分钟。
5 分钟、10 分钟没有 oracle 价格，也没有结算。
用 K 线参考价判定会违反 chart price 仅参考、不作结算依据的边界。
```

节奏与等待：一条完整 3 连胜要跨越三个连续 oracle 到期。这被接受，因为节奏由连续交易层（实时 PnL + Cash Out，见第 7 节与 9.3）承担，串关只负责高承诺的声誉玩法；等待期间用户本来就在持续交易，不存在干等。

真钱串关需要后续额外设计 Parlay Vault / Bonus Pool / 风险控制，不进入 MVP。

## 9. 页面结构

MVP 采用单页 Arena 体验。

```text
1. Chart + Market Pulse
2. Round Arena / Challenge Cards
3. Account + Position / Redeem
4. Leaderboard
5. Social Feed / Sealed Calls
```

### 9.1 Chart + Market Pulse

必须展示：

- BTC K 线。
- Chart Price。
- Oracle Spot。
- Chart / Oracle Diff。
- Oracle Freshness。
- Current Expiry。
- Countdown。
- 当前选择的 strike line。
- 当前选择的 range band。
- settlement marker。

重要边界：

```text
Chart Price = 外部行情参考
Oracle Spot = DeepBook Predict 报价和结算参考
```

如果两者偏差过大，提示用户：

```text
Chart and oracle prices differ. Quotes and settlement use DeepBook Predict oracle.
```

### 9.2 Round Arena / Challenge Cards

Challenge Cards 替代旧的纯交易卡片。

每张卡片展示：

- challenge name。
- trade type。
- strike / range。
- expiry。
- time remaining。
- dUSDC cost。
- estimated payout。
- max loss。
- oracle freshness。
- Join button。

Custom Builder 仍保留，但作为高级用户入口。

### 9.3 Account + Positions

Account 展示：

- Wallet connected state。
- Network。
- dUSDC wallet balance。
- PredictManager status。
- Manager dUSDC balance。

Positions 展示：

- round / expiry。
- trade type。
- strike / range。
- quantity。
- cost。
- status。
- 实时浮动 PnL：进行中仓位展示 `当前退出价 - 成本`，按现有轮询节奏刷新。
- **Cash Out 按钮**：进行中仓位（oracle ACTIVE 且新鲜）可按当前 live bid 立即平仓，payout 回到 PredictManager。串关 leg 平仓前需确认"将弃权连胜"。
- settlement result。
- redeem button。

实时 PnL 和 Cash Out 价用 quote / simulate 路径已有的 live mark / `liveRedeem` 值；提前平仓按 bid 价成交（含 vault spread），最终结算输赢仍以 OracleSVI settlement price 为准。

Market / expiry 状态和 position 状态不要混在一起。

Market / expiry 状态：

```text
OPEN_TO_TRADE
CLOSED_TO_NEW_TRADES (opening cutoff，仍可 Cash Out)
PENDING_SETTLEMENT (冻结：不可开仓也不可退出)
SETTLED
```

Position 状态：

```text
OPEN (可 Cash Out)
FROZEN (oracle 到期未结算，等待)
REDEEMABLE
REDEEMED
LOST
SURRENDERED (串关 leg 提前平仓弃权，中性状态)
```

### 9.4 Leaderboard

Leaderboard 展示：

- Top 10 opt-in users。
- alias 或短地址。
- win rate。
- completed rounds。
- streak。
- total PnL，若可可靠计算。

未达到最少完成局数的用户可以展示在个人 profile 中，但不进入主榜。

### 9.5 Social Feed

Feed 展示：

- public calls。
- sealed calls 的 locked / revealed 状态。
- verified showcases。
- tx links。
- round result。

用户发布内容时应明确：

```text
Public Call: 立即公开
Sealed Call: 到期后公开
Showcase: 结算后晒单
```

### 9.6 Vault / PLP Protocol Context

Vault / PLP 是 DeepBook Predict 的交易对手方和流动性来源。MVP 主界面不再展示独立 Vault & Oracle Health 面板；这些数据保留在 pitch、技术文档和未来 professional mode 中。

## 10. Strike 校验

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

## 11. MVP 验收标准

MVP 需要满足：

- 用户能连接钱包。
- 用户能看到 BTC K 线。
- 用户能看到 active oracle 和 expiry countdown。
- 用户能看到 Round Arena。
- 用户能选择 Above / Below / Range challenge。
- 用户能自定义 strike / range。
- 前端能 snap strike。
- 用户能看到 quote preview。
- 用户能签名并 mint / mint_range。
- Position 能显示，并带实时浮动 PnL。
- 进行中仓位能随时 Cash Out（未结算 live bid 平仓）。
- 到期后能 redeem / redeem_range。
- 连胜串关可用，串关 leg 提前平仓有弃权确认。
- 用户能 opt-in leaderboard。
- Leaderboard 能展示 Top 10 规则和真实/可追溯统计。
- 用户能发表 Call 或 Showcase。
- Sealed Calls 和 Combo 至少有清晰产品状态和技术边界，若未完成链上/SDK 集成，不应包装成已生产可用。

如果只能展示 UI，不能完成 mint / redeem，则不算完整 MVP。

## 12. 商业闭环

Strike5 对 DeepBook 的价值：

- 带来真实用户交易。
- 增加 dUSDC 使用。
- 增加 PredictManager 创建。
- 增加 mint / redeem 链上交易。
- 增加 Predict Vault / PLP 流动性需求。
- 通过 Arena、排行榜、晒单和 Combo 提高复玩率。
- 把 DeepBook Predict 包装成用户能理解、愿意分享的预测竞技产品。

对用户的价值：

- 短周期 BTC 预测。
- 固定最大亏损。
- 没有杠杆爆仓。
- K 线和新闻信号辅助判断。
- 链上 settlement。
- 到期 redeem。
- opt-in 公开战绩。
- Sealed Calls 证明赛前观点。
- Combo 带来连续预测挑战。

对黑客松评委的价值：

- 不是 mock prediction UI。
- 不是单纯 frontend。
- 能展示 DeepBook Predict 的真实交易闭环。
- 有清晰的用户增长循环和商业化延展。
- 合理使用 Sui privacy stack 的应用层隐私，而不夸大链上交易隐私。
