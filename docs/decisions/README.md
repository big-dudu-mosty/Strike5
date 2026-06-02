# Strike5 Decision Records

本目录用于保存 Strike5 的重要产品和技术决策。

目标是避免后续实现过程中忘记“为什么这样做”，也方便黑客松结束后复盘和向评委解释技术取舍。

## 1. 文件命名

使用递增编号：

```text
0001-mvp-architecture-baseline.md
0002-decision-record-process.md
0003-frontend-scaffold-choice.md
0004-kline-provider-choice.md
```

## 2. 决策状态

每条记录使用一个状态：

```text
Proposed
Accepted
Superseded
Rejected
```

如果后续决策覆盖旧决策，不删除旧文件，而是在旧文件里标记：

```text
Status: Superseded by 000X-...
```

## 3. 什么时候需要记录

必须记录：

- 产品主线变化。
- MVP 范围变化。
- 技术栈选择。
- 新依赖选择。
- 数据源选择。
- DeepBook Predict 接入方式变化。
- Sui RPC / Predict Server 权威状态边界变化。
- 交易流程变化。
- 影响 demo 讲法的变化。

不一定需要记录：

- 小样式调整。
- 文案微调。
- 局部 bugfix。
- 不影响架构的组件拆分。

## 4. 模板

```markdown
# 000X: Decision Title

Status: Proposed | Accepted | Superseded | Rejected
Date: YYYY-MM-DD

## Context

为什么需要做这个决策。

## Decision

最终决定是什么。

## Rationale

为什么这样选。

## Consequences

这个选择带来的影响，包括好处、限制和后续工作。

## Alternatives Considered

考虑过但没有采用的方案。

## Revisit When

什么情况下需要重新评估。
```

## 5. 当前已记录决策

- `0001-mvp-architecture-baseline.md`
- `0002-decision-record-process.md`
- `0003-frontend-scaffold-choice.md`
- `0004-predict-server-data-foundation.md`
- `0005-lightweight-i18n.md`
- `0006-btc-kline-provider-choice.md`
- `0007-predict-manager-account-flow.md`
- `0008-separate-dusdc-deposit-before-mint.md`
- `0009-quick-picks-and-quote-preview.md`
- `0010-mint-transactions-from-quote-preview.md`
